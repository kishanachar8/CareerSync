import { google } from 'googleapis';
import redis from '../../config/redis.js';
import env from '../../config/env.js';
import GmailToken from '../../models/GmailToken.js';
import Application from '../../models/Application.js';
import { encrypt, decrypt } from '../../utils/crypto.util.js';
import logger from '../../utils/logger.js';

// ─── OAuth client factory ─────────────────────────────────────────────────────

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ─── Auth URL ─────────────────────────────────────────────────────────────────

export const getGmailAuthUrl = async (userId) => {
  // Store state → userId mapping in Redis (10 min TTL)
  const state = `gmail_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await redis.set(`gmail:state:${state}`, String(userId), 'EX', 600).catch(() => {});

  const client = makeOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
};

// ─── OAuth callback ───────────────────────────────────────────────────────────

export const handleGmailCallback = async (code, state) => {
  // Retrieve userId from Redis state
  const userId = await redis.get(`gmail:state:${state}`).catch(() => null);
  if (!userId) throw new Error('Invalid or expired OAuth state. Please try connecting again.');
  await redis.del(`gmail:state:${state}`).catch(() => {});

  const client = makeOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Get connected email address
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data: userInfo } = await oauth2.userinfo.get();
  const email = userInfo.email;

  // Upsert token record (encrypted)
  await GmailToken.findOneAndUpdate(
    { userId },
    {
      userId,
      email,
      accessToken:  encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token || ''),
      expiryDate:   tokens.expiry_date || 0,
    },
    { upsert: true, new: true },
  );

  logger.info(`[Gmail] Connected ${email} for user ${userId}`);
  return email;
};

// ─── Token helper ─────────────────────────────────────────────────────────────

async function getAuthedClient(userId) {
  const record = await GmailToken.findOne({ userId });
  if (!record) throw new Error('Gmail not connected');

  const client = makeOAuth2Client();
  client.setCredentials({
    access_token:  decrypt(record.accessToken),
    refresh_token: record.refreshToken ? decrypt(record.refreshToken) : undefined,
    expiry_date:   record.expiryDate,
  });

  // Auto-refresh if expired
  client.on('tokens', async (newTokens) => {
    const update = { expiryDate: newTokens.expiry_date };
    if (newTokens.access_token) update.accessToken  = encrypt(newTokens.access_token);
    if (newTokens.refresh_token) update.refreshToken = encrypt(newTokens.refresh_token);
    await GmailToken.findOneAndUpdate({ userId }, { $set: update }).catch(() => {});
  });

  return { client, record };
}

// ─── Status detection ─────────────────────────────────────────────────────────

// Rank drives the "only move forward" rule (except rejected, which is always applied).
const STATUS_RANK = {
  pending: 0, pending_manual: 0,
  applied: 1, under_review: 2, shortlisted: 3,
  interviewing: 4, offered: 5, rejected: -1,
};

function detectStatus(subject = '', snippet = '') {
  const t = (subject + ' ' + snippet).toLowerCase();
  if (/offer letter|pleased to offer|extend.*offer|job offer|congratulations.*offer/.test(t))                                                   return 'offered';
  if (/shortlist|shortlisted|moved.*next|advance.*next|next.*round|selected.*interview/.test(t))                                                return 'shortlisted';
  if (/interview|technical screen|meet with|schedule.*call|phone screen|virtual meet|spoken with|online assessment|coding challenge|hackerrank|codility/.test(t)) return 'interviewing';
  if (/under review|being reviewed|reviewing your|in review|our team.*review/.test(t))                                                          return 'under_review';
  if (/unfortunately|regret to inform|not moving forward|other candidates|position.*filled|not selected|not proceed|won't be moving|we will not/.test(t)) return 'rejected';
  if (/received your application|thank you for applying|application received|we.*received your|application.*submitted|thank you for your interest/.test(t)) return 'applied';
  return null;
}

// ─── Company / title matching ─────────────────────────────────────────────────

function extractDomain(from = '') {
  const m = from.match(/@([a-z0-9.-]+)\./i);
  return m ? m[1].toLowerCase().replace(/^(mail|jobs|careers|noreply|hr|recruit)\./i, '') : '';
}

// Score an email against an application — higher = better match.
// Combining domain similarity and title-word hits gives far fewer false positives
// than domain alone.
function matchScore(email, app) {
  const company  = (app.jobId?.company || '').toLowerCase();
  const title    = (app.jobId?.title   || '').toLowerCase();
  const domain   = extractDomain(email.from);
  const subject  = email.subject.toLowerCase();
  const snippet  = (email.snippet || '').toLowerCase();

  if (!domain || !company) return 0;

  let score = 0;

  // Domain → company name
  const companySlug = company.replace(/\s+(pvt|ltd|llc|inc|corp|private|limited|technologies?|solutions?|systems?)\b.*$/i, '').replace(/\s+/g, '');
  if (companySlug && (companySlug.includes(domain) || domain.includes(companySlug.slice(0, 6)))) score += 3;

  // Title words in subject
  const titleWords = title.split(/\s+/).filter((w) => w.length > 3);
  const titleHits  = titleWords.filter((w) => subject.includes(w) || snippet.includes(w)).length;
  if (titleHits > 0) score += Math.min(titleHits, 2);

  // Company name words in subject/snippet
  const compWords = company.split(/\s+/).filter((w) => w.length > 3);
  if (compWords.some((w) => subject.includes(w) || snippet.includes(w))) score += 1;

  return score;
}

// ─── Main sync function ───────────────────────────────────────────────────────

export const syncGmailEmails = async (userId) => {
  const { client, record } = await getAuthedClient(userId);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const query = 'newer_than:60d (application OR interview OR offer OR hiring OR position OR opportunity)';
  const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 100 });

  const messages = listRes.data.messages || [];
  if (!messages.length) {
    await GmailToken.findOneAndUpdate({ userId }, { $set: { lastSyncAt: new Date(), lastSyncUpdates: [] } });
    return { total: 0, updated: 0, updates: [] };
  }

  // Fetch headers in parallel batches of 20
  const parsed = [];
  for (let i = 0; i < messages.length; i += 20) {
    const results = await Promise.allSettled(
      messages.slice(i, i + 20).map((m) =>
        gmail.users.messages.get({
          userId: 'me', id: m.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        }),
      ),
    );
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const msg     = r.value.data;
      const headers = Object.fromEntries((msg.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
      parsed.push({
        id:      msg.id,
        subject: headers.subject || '',
        from:    headers.from    || '',
        date:    headers.date ? new Date(headers.date) : new Date(),
        snippet: msg.snippet || '',
      });
    }
  }

  const applications = await Application.find({ userId })
    .populate({ path: 'jobId', select: 'company title' })
    .lean();

  if (!applications.length) {
    await GmailToken.findOneAndUpdate({ userId }, { $set: { lastSyncAt: new Date(), lastSyncUpdates: [] } });
    return { total: parsed.length, updated: 0, updates: [] };
  }

  const updates = [];

  for (const email of parsed) {
    const detectedStatus = detectStatus(email.subject, email.snippet);
    if (!detectedStatus) continue;

    // Pick the best-scoring application for this email
    let bestApp = null, bestScore = 0;
    for (const app of applications) {
      const s = matchScore(email, app);
      if (s > bestScore) { bestScore = s; bestApp = app; }
    }
    if (!bestApp || bestScore < 2) continue;   // require at least a domain hit

    const currentStatus = bestApp.status;
    const currentRank   = STATUS_RANK[currentStatus] ?? 0;
    const newRank       = STATUS_RANK[detectedStatus] ?? 0;

    const shouldUpdate =
      currentStatus !== 'offered' &&
      currentStatus !== detectedStatus &&
      (detectedStatus === 'rejected' || newRank > currentRank);

    if (!shouldUpdate) continue;

    const note = `[Gmail ${new Date().toLocaleDateString()}] "${email.subject.slice(0, 100)}" from ${email.from.slice(0, 80)}`;

    // The pre-save hook in Application.js will auto-append to statusHistory
    await Application.findByIdAndUpdate(bestApp._id, {
      $set: {
        status:         detectedStatus,
        matchedEmailId: email.id,
        // _statusNote is consumed by the pre-hook and stripped before DB write
        _statusNote: note,
        source: 'auto',
      },
    });

    updates.push({
      applicationId: bestApp._id,
      company:       bestApp.jobId?.company || '',
      jobTitle:      bestApp.jobId?.title   || '',
      oldStatus:     currentStatus,
      newStatus:     detectedStatus,
      emailSubject:  email.subject.slice(0, 150),
      emailFrom:     email.from.slice(0, 100),
      matchScore:    bestScore,
    });

    bestApp.status = detectedStatus;   // prevent re-match in same sync pass
  }

  await GmailToken.findOneAndUpdate({ userId }, { $set: { lastSyncAt: new Date(), lastSyncUpdates: updates } });
  logger.info(`[Gmail] Sync user ${userId}: ${parsed.length} emails → ${updates.length} updates`);
  return { total: parsed.length, updated: updates.length, updates };
};

// ─── Status ───────────────────────────────────────────────────────────────────

export const getGmailStatus = async (userId) => {
  const record = await GmailToken.findOne({ userId }).lean();
  if (!record) return { connected: false };
  return {
    connected:       true,
    email:           record.email,
    lastSyncAt:      record.lastSyncAt,
    lastSyncUpdates: record.lastSyncUpdates || [],
  };
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

export const disconnectGmail = async (userId) => {
  const record = await GmailToken.findOne({ userId });
  if (!record) return;

  // Revoke token with Google
  try {
    const client = makeOAuth2Client();
    client.setCredentials({ access_token: decrypt(record.accessToken) });
    await client.revokeCredentials();
  } catch {
    // Ignore revocation errors — still delete from DB
  }

  await GmailToken.deleteOne({ userId });
  logger.info(`[Gmail] Disconnected for user ${userId}`);
};
