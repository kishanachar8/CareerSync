/**
 * Naukri Direct Apply — headed (visible) Chromium automation.
 *
 * Behaviour per job:
 *   • Naukri apply modal  → fills known fields + pauses for user to type extras
 *                           → captures every field the user filled → saves for reuse
 *   • Company website     → opens URL in a new visible tab → continues to next job
 *                           (user applies manually in those tabs later)
 *
 * Field capture:
 *   Any value the user types while the bot is paused is read, normalised, and
 *   saved to AutomationCredentials.capturedFields so it is pre-filled on every
 *   subsequent job in this run AND in all future runs.
 */

import { chromium } from 'playwright';
import AutomationRun from '../../models/AutomationRun.js';
import AutomationCredentials from '../../models/AutomationCredentials.js';
import Application from '../../models/Application.js';
import Job from '../../models/Job.js';
import logger from '../../utils/logger.js';
import { saveSession, loadSession } from '../browser/sessionManager.js';
import { handleScreeningQuestions, makePauseResolver } from '../qa/index.js';
import * as qaService from '../qa/qaService.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PORTAL    = 'naukri';
const BASE      = 'https://www.naukri.com';
const LOGIN_URL = 'https://www.naukri.com/nlogin/login';

// Pause per chatbot step so the user can fill unknown fields (ms)
const USER_FILL_PAUSE = 8_000;
// Wait between jobs (ms range)
const BETWEEN_JOBS_MIN = 4_000;
const BETWEEN_JOBS_MAX = 7_000;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Selectors ────────────────────────────────────────────────────────────────

const LOGIN_SEL = {
  email:   '#usernameField',
  password:'#passwordField',
  submit:  'button[type="submit"]',
  error:   '.err-container, [class*="errorMessage"]',
  // any one present = logged-in
  loggedIn: [
    '[class*="nI-gNb-drawer__icon"]',
    'a[href*="mnjuser"]',
    '[class*="view-profile"]',
    '.nI-gNb-nav__icon--profile',
    '[class*="user-name"]',
  ],
};

const SRP_TITLE_SELS = [
  'a.title',
  '.srp-jobtuple-wrapper a.title',
  '.jobTuple a.title',
  '.cust-job-tuple a.title',
  'h2 a[href*="naukri.com"]',
  '[class*="title"] a[href*="naukri.com"]',
  'a[href*="naukri.com/job-listings"]',
];

// "Apply on company website" indicators — checked BEFORE clicking anything
const EXTERNAL_BTN_SELS = [
  'button[class*="ext-apply"]',
  'a[class*="ext-apply"]',
  '[class*="external-apply"]',
  'button:has-text("Apply on Company Website")',
  'a:has-text("Apply on Company Website")',
  'button:has-text("Apply on company website")',
];

const NAUKRI_APPLY_BTN_SELS = [
  'button[id*="apply"]',
  'button.chatBtn',
  'button[class*="apply-button"]:not([class*="ext"])',
  'a[class*="apply-button"]:not([class*="ext"])',
  'button:has-text("Apply")',
];

const MODAL_SEL = {
  alreadyApplied: '[class*="already-applied"], button:disabled:has-text("Applied")',
  success:        '[class*="success-message"], [class*="applied-success"], div:has-text("successfully applied"), h2:has-text("Application Submitted")',
  nextBtn:        'button:has-text("Next"), button[class*="next-btn"]',
  submitBtn:      'button:has-text("Submit"), button:has-text("Apply Now"), button:has-text("Apply")',
  // Fields we auto-fill (ordered by preference)
  noticePeriod:  'select[id*="notice" i], input[placeholder*="notice" i], select[name*="notice" i]',
  currentCtc:    'input[placeholder*="current" i][placeholder*="ctc" i], input[name*="currentCtc" i]',
  expectedCtc:   'input[placeholder*="expected" i][placeholder*="ctc" i], input[name*="expectedCtc" i]',
  relevantExp:   'input[placeholder*="relevant" i], input[name*="relevantExp" i], [id*="relevantExp" i] input',
  totalExp:      'input[placeholder*="total exp" i], input[name*="totalExp" i]',
  location:      'input[placeholder*="location" i]:not([placeholder*="job" i])',
};

// ─── Browser ──────────────────────────────────────────────────────────────────

async function launchHeadedBrowser() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 80,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: null,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  return { browser, ctx };
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function isLoggedIn(page) {
  for (const sel of LOGIN_SEL.loggedIn) {
    if (await page.$(sel).catch(() => null)) return true;
  }
  const url = page.url();
  if (url.includes('/mnjuser') || url.includes('myapps')) return true;
  // Accept any naukri.com page that is NOT the login page
  if (url.includes('naukri.com') && !url.includes('/nlogin') && !url.includes('/login')) return true;
  return false;
}

async function doLogin(page, ctx, userId, username, password) {
  logger.info('[NaukriDirect] Logging in…');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await delay(jitter(1000, 2000));
  try { await page.keyboard.press('Escape'); } catch {}

  const emailEl = await page.waitForSelector(LOGIN_SEL.email, { timeout: 10_000 });
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(username, { delay: jitter(70, 140) });
  await delay(jitter(400, 800));

  const passEl = await page.waitForSelector(LOGIN_SEL.password, { timeout: 5_000 });
  await passEl.click({ clickCount: 3 });
  await passEl.type(password, { delay: jitter(70, 140) });
  await delay(jitter(500, 1000));

  await page.click(LOGIN_SEL.submit);

  await Promise.race([
    page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
    page.waitForSelector(LOGIN_SEL.error, { timeout: 20_000 }),
  ]).catch(() => {});

  await delay(jitter(1500, 2500));

  const errEl = await page.$(LOGIN_SEL.error).catch(() => null);
  if (errEl) {
    const txt = (await errEl.textContent())?.trim() || 'Login failed';
    throw new Error(`Naukri login error: ${txt}`);
  }

  if (!(await isLoggedIn(page))) {
    throw new Error('Login appeared to succeed but no dashboard indicator found — possible CAPTCHA visible in the browser window.');
  }

  await saveSession(ctx, userId, PORTAL);
  logger.info('[NaukriDirect] Login successful');
}

// ─── Search ───────────────────────────────────────────────────────────────────

// Extract Naukri's internal job ID from a job URL.
// URL formats seen in the wild:
//   /job-listings-title-company-location-190924000003
//   /job-listings?jobId=190924000003
function extractNaukriJobId(href) {
  try {
    const url = new URL(href);
    const qp  = url.searchParams.get('jobId');
    if (qp) return qp;
    const m = url.pathname.match(/(\d{12,})$/);
    return m ? m[1] : null;
  } catch { return null; }
}

// Naukri slug: dots → -dot-, everything else non-alphanum → hyphen
function toNaukriSlug(text) {
  return text
    .toLowerCase()
    .replace(/\./g, '-dot-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

// Build the Naukri search URL.
// Use only slug + query params — avoids the k/l/nignore params that cause
// Naukri to ignore jobAge when both the slug and text-search params are present.
function buildSearchUrl(keywords, location, freshness = 0, yearsOfExperience = 0) {
  const slug    = toNaukriSlug(keywords);
  const locSlug = location ? `-in-${toNaukriSlug(location)}` : '';
  const params  = new URLSearchParams();
  if (freshness > 0)           params.set('jobAge', String(freshness));
  if (yearsOfExperience > 0)   params.set('experience', String(yearsOfExperience));
  const qs = params.toString();
  return `${BASE}/${slug}-jobs${locSlug}${qs ? '?' + qs : ''}`;
}

// Naukri slug pagination: page 1 = no suffix, page 2 = "-2", page 3 = "-3", …
// Query params (jobAge, experience) are preserved.
function buildNextPageUrl(currentUrl) {
  try {
    const u = new URL(currentUrl);
    const m = u.pathname.match(/^(.*?)-(\d+)$/);
    u.pathname = m ? `${m[1]}-${parseInt(m[2], 10) + 1}` : `${u.pathname}-2`;
    return u.toString();
  } catch { return null; }
}

// Extract jobs from the page currently loaded in `page`.
async function scrapeCurrentSRPPage(page, max) {
  return page.evaluate(
    ({ sels, max }) => {
      const seen = new Set(), results = [];
      for (const sel of sels) {
        for (const a of document.querySelectorAll(sel)) {
          const href = a.href || '', title = a.textContent?.trim() || '';
          if (!href || !title || seen.has(href) || !href.includes('naukri.com')) continue;
          seen.add(href);
          const card = a.closest('article') || a.closest('[class*="jobTuple"]') || a.closest('[class*="job-container"]');
          const compEl = card?.querySelector('[class*="comp-name"], a.comp-name');
          // Location: try multiple Naukri SRP card selectors
          const locEl = card?.querySelector(
            '.loc a, .loc span, [class*="location"] a, [class*="location"] span, ' +
            '[class*="loc-link"], li.location, span[class*="location"], [class*="locWdth"]',
          );
          const locLinks = card ? [...card.querySelectorAll('a[href*="/jobs-in-"]')] : [];
          const location = locEl?.textContent?.trim()
            || locLinks.map(l => l.textContent?.trim()).filter(Boolean).join(', ')
            || '';
          results.push({
            href,
            title,
            company: compEl?.textContent?.trim() || '',
            location,
          });
          if (results.length >= max) return results;
        }
        if (results.length >= max) break;
      }
      return results;
    },
    { sels: SRP_TITLE_SELS, max },
  );
}

// Paginate through Naukri SRP pages until maxJobs are collected.
// Naukri shows 20 results per page — so 50 jobs = 3 pages.
async function extractJobsFromSRP(page, maxJobs) {
  await page.waitForSelector(SRP_TITLE_SELS.join(', '), { timeout: 15_000 }).catch(() => {});
  await delay(jitter(1500, 2500));

  const NAUKRI_PAGE_SIZE = 20;
  const seen = new Set();
  const allJobs = [];

  while (allJobs.length < maxJobs) {
    const needed   = maxJobs - allJobs.length;
    const pageJobs = await scrapeCurrentSRPPage(page, needed);

    for (const job of pageJobs) {
      if (!seen.has(job.href)) { seen.add(job.href); allJobs.push(job); }
      if (allJobs.length >= maxJobs) break;
    }

    // Fewer than a full page = last page of results
    if (pageJobs.length < NAUKRI_PAGE_SIZE || allJobs.length >= maxJobs) break;

    const nextUrl = buildNextPageUrl(page.url());
    if (!nextUrl) break;

    logger.info(`[NaukriDirect] Paginating → ${nextUrl}`);
    await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await delay(jitter(2000, 3000));

    // Stop if the next page has no job cards (gone past last page)
    const hasResults = await page.$(SRP_TITLE_SELS.join(', ')).catch(() => null);
    if (!hasResults) break;
  }

  return allJobs;
}

// ─── Field helpers ────────────────────────────────────────────────────────────

/**
 * Build the full field map by merging base preferences + capturedFields.
 * capturedFields wins (more specific / user-corrected values).
 */
function buildFieldMap(prefs, capturedFields) {
  // yearsOfExperience from prefs is the user-stated default for both relevant
  // and total experience fields — overridden by anything captured in a prior run.
  const expFallback = prefs.yearsOfExperience > 0 ? prefs.yearsOfExperience : null;
  return {
    noticePeriodDays:        capturedFields.noticePeriodDays        ?? prefs.noticePeriodDays  ?? 30,
    currentCtcLakhs:         capturedFields.currentCtcLakhs         ?? prefs.currentCtcLakhs   ?? 0,
    expectedCtcLakhs:        capturedFields.expectedCtcLakhs        ?? prefs.expectedCtcLakhs  ?? 0,
    relevantExperienceYears: capturedFields.relevantExperienceYears ?? expFallback,
    totalExperienceYears:    capturedFields.totalExperienceYears    ?? expFallback,
    currentLocation:         capturedFields.currentLocation         ?? null,
    ...capturedFields,
  };
}

async function fillKnownFields(page, fieldMap) {
  // Notice period
  const noticeEl = await page.$(MODAL_SEL.noticePeriod).catch(() => null);
  if (noticeEl) {
    const tag = await noticeEl.evaluate((el) => el.tagName.toLowerCase()).catch(() => 'input');
    if (tag === 'select') {
      const opts = await noticeEl.$$eval('option', (os) => os.map((o) => ({ v: o.value, t: o.text })));
      const best = opts.find((o) =>
        o.t.includes(String(fieldMap.noticePeriodDays)) || o.v.includes(String(fieldMap.noticePeriodDays)),
      );
      if (best) await noticeEl.selectOption(best.v).catch(() => {});
    } else if (fieldMap.noticePeriodDays) {
      await noticeEl.fill(String(fieldMap.noticePeriodDays)).catch(() => {});
    }
  }

  // Current CTC
  if (fieldMap.currentCtcLakhs > 0) {
    const el = await page.$(MODAL_SEL.currentCtc).catch(() => null);
    if (el) await el.fill(String(fieldMap.currentCtcLakhs)).catch(() => {});
  }

  // Expected CTC
  if (fieldMap.expectedCtcLakhs > 0) {
    const el = await page.$(MODAL_SEL.expectedCtc).catch(() => null);
    if (el) await el.fill(String(fieldMap.expectedCtcLakhs)).catch(() => {});
  }

  // Relevant experience (if captured from a previous job)
  if (fieldMap.relevantExperienceYears != null) {
    const el = await page.$(MODAL_SEL.relevantExp).catch(() => null);
    if (el) await el.fill(String(fieldMap.relevantExperienceYears)).catch(() => {});
  }

  // Total experience
  if (fieldMap.totalExperienceYears != null) {
    const el = await page.$(MODAL_SEL.totalExp).catch(() => null);
    if (el) await el.fill(String(fieldMap.totalExperienceYears)).catch(() => {});
  }

  // Current location
  if (fieldMap.currentLocation) {
    const el = await page.$(MODAL_SEL.location).catch(() => null);
    if (el) await el.fill(String(fieldMap.currentLocation)).catch(() => {});
  }
}

// Normalise any string to a stable cache key (same helper used in both evaluate() calls)
const toKey = (t) =>
  t?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || null;

// ── Shared label-finder logic (inlined into each evaluate() call) ─────────────
// Naukri's apply modal uses multiple structures:
//   • Standard forms   → <label for="id">
//   • Chatbot modal    → .chatbot-ques / [class*="ques"] sibling text
//   • Quick-apply form → label / legend inside a parent container
const FIND_LABEL_FN = /* js */`
  function findLabel(el) {
    if (el.id) {
      try {
        const lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl && lbl.textContent.trim()) return lbl.textContent.trim();
      } catch {}
    }
    let node = el.parentElement;
    for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
      const qEl = node.querySelector(
        '[class*="chatbot-ques"],[class*="chatbotQues"],[class*="ssrc__ques"],' +
        '[class*="question-label"],[class*="questionLabel"]'
      );
      if (qEl && qEl.textContent.trim()) return qEl.textContent.trim();
      const lbl = node.querySelector('label,legend');
      if (lbl && lbl !== el && lbl.textContent.trim().length < 200) return lbl.textContent.trim();
      if (/form[-_]?field|field[-_]?group|widget|question|form[-_]?row/i.test(node.className || '')) break;
    }
    return el.getAttribute('aria-label') || el.placeholder || el.name || null;
  }
`;

/**
 * Capture ALL filled field values from the visible apply modal, keyed by the
 * question label text (not by field id/name which changes every session).
 * Handles: text/number inputs, select dropdowns (stores option text), radio buttons.
 */
async function captureAllAnswers(page) {
  return page.evaluate((findLabelSrc) => {
    // eslint-disable-next-line no-new-func
    const findLabel = new Function('el', findLabelSrc + '\nreturn findLabel(el);');
    const toKey = (t) =>
      t?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || null;

    const modal =
      document.querySelector('[class*="chatbot"]') ||
      document.querySelector('[class*="applyModal"]') ||
      document.querySelector('[class*="apply-modal"]') ||
      document.querySelector('[class*="apply-form"]') ||
      document.querySelector('form') || document.body;

    const answers = {};

    // ── Text / number / tel / textarea ──────────────────────────────────────
    for (const el of modal.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="file"])' +
      ':not([type="radio"]):not([type="checkbox"]), textarea',
    )) {
      const val = el.value?.trim();
      if (!val || val === '0') continue;
      const key = toKey(findLabel(el));
      if (key) answers[key] = val;
    }

    // ── Select — store option text, not value (more stable across sessions) ─
    for (const el of modal.querySelectorAll('select')) {
      if (!el.value || el.selectedIndex < 0) continue;
      const text = el.options[el.selectedIndex]?.text?.trim();
      if (!text || /^select|^choose|^-/i.test(text) || text === '0') continue;
      const key = toKey(findLabel(el));
      if (key) answers[key] = text;
    }

    // ── Radio buttons ────────────────────────────────────────────────────────
    for (const fieldset of modal.querySelectorAll('fieldset')) {
      const legend = fieldset.querySelector('legend');
      if (!legend) continue;
      const checked = fieldset.querySelector('input[type="radio"]:checked');
      if (!checked) continue;
      let ans = checked.value;
      try {
        const lbl = fieldset.querySelector('label[for="' + CSS.escape(checked.id) + '"]') ||
                    checked.closest('label');
        if (lbl) ans = lbl.textContent?.trim() || ans;
      } catch {}
      const key = toKey(legend.textContent);
      if (key && ans) answers[key] = ans;
    }

    return answers;
  }, FIND_LABEL_FN);
}

/**
 * Pre-fill the current modal step with all cached question-answer pairs by
 * matching question label text to cache keys.
 * Only fills fields that are currently empty — doesn't overwrite user changes.
 */
async function replayAnswers(page, cache) {
  const entries = Object.entries(cache).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return;

  await page.evaluate(([cacheEntries, findLabelSrc]) => {
    // eslint-disable-next-line no-new-func
    const findLabel = new Function('el', findLabelSrc + '\nreturn findLabel(el);');
    const toKey = (t) =>
      t?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || null;
    const cacheObj = Object.fromEntries(cacheEntries);

    const setNative = (el, val) => {
      const proto = el.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, val); else el.value = val;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const modal =
      document.querySelector('[class*="chatbot"]') ||
      document.querySelector('[class*="applyModal"]') ||
      document.querySelector('[class*="apply-modal"]') ||
      document.querySelector('[class*="apply-form"]') ||
      document.querySelector('form') || document.body;

    // ── Text / textarea ──────────────────────────────────────────────────────
    for (const el of modal.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="file"])' +
      ':not([type="radio"]):not([type="checkbox"]), textarea',
    )) {
      if (el.value?.trim()) continue;
      const key = toKey(findLabel(el));
      if (key && cacheObj[key] !== undefined) setNative(el, String(cacheObj[key]));
    }

    // ── Select ───────────────────────────────────────────────────────────────
    for (const el of modal.querySelectorAll('select')) {
      if (el.value && el.value !== '' && el.value !== '0') continue;
      const key = toKey(findLabel(el));
      if (!key || cacheObj[key] === undefined) continue;
      const target = String(cacheObj[key]).toLowerCase();
      for (const opt of el.options) {
        if (opt.text.trim().toLowerCase() === target ||
            opt.text.trim().toLowerCase().includes(target)) {
          el.value = opt.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }

    // ── Radio buttons ────────────────────────────────────────────────────────
    for (const fieldset of modal.querySelectorAll('fieldset')) {
      if (fieldset.querySelector('input[type="radio"]:checked')) continue;
      const legend = fieldset.querySelector('legend');
      const key = toKey(legend?.textContent);
      if (!key || cacheObj[key] === undefined) continue;
      const target = String(cacheObj[key]).toLowerCase();
      for (const radio of fieldset.querySelectorAll('input[type="radio"]')) {
        let txt = '';
        try {
          const lbl = fieldset.querySelector('label[for="' + CSS.escape(radio.id) + '"]') ||
                      radio.closest('label');
          txt = (lbl?.textContent?.trim() || radio.value)?.toLowerCase();
        } catch { txt = radio.value?.toLowerCase() || ''; }
        if (txt === target || txt.includes(target)) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }
  }, [entries, FIND_LABEL_FN]);
}

/**
 * Normalise raw captured keys into well-known preference keys.
 * Returns an object suitable for merging into capturedFields.
 */
function normaliseCapture(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (/relevant.*exp|exp.*relevant/.test(k)) {
      out.relevantExperienceYears = isNaN(v) ? v : Number(v);
    } else if (/total.*exp|exp.*total/.test(k)) {
      out.totalExperienceYears = isNaN(v) ? v : Number(v);
    } else if (/notice/.test(k)) {
      out.noticePeriodDays = isNaN(v) ? v : Number(v);
    } else if (/current.*ctc|ctc.*current|current.*sal/.test(k)) {
      out.currentCtcLakhs = isNaN(v) ? v : Number(v);
    } else if (/expect.*ctc|ctc.*expect|expect.*sal/.test(k)) {
      out.expectedCtcLakhs = isNaN(v) ? v : Number(v);
    } else if (/location/.test(k)) {
      out.currentLocation = v;
    } else {
      // Store verbatim for any unknown field
      out[k] = v;
    }
  }
  return out;
}

/** Persist newly-discovered values back to AutomationCredentials */
async function saveDiscoveredFields(userId, portal, newFields) {
  if (!Object.keys(newFields).length) return;
  const setObj = {};
  for (const [k, v] of Object.entries(newFields)) {
    setObj[`capturedFields.${k}`] = v;
  }
  await AutomationCredentials.findOneAndUpdate({ userId, portal }, { $set: setObj }).catch(() => {});
  logger.info(`[NaukriDirect] Saved ${Object.keys(newFields).length} captured field(s): ${Object.keys(newFields).join(', ')}`);
}

// ─── Apply flow ───────────────────────────────────────────────────────────────

/**
 * Attempt to apply to a single Naukri job.
 *
 * Returns one of:
 *   { result: 'applied',   message, newFields }
 *   { result: 'external',  message, externalUrl }
 *   { result: 'already_applied', message }
 *   { result: 'skipped',   message }
 *   { result: 'failed',    message }
 */
async function applyToJob(page, ctx, job, fieldMap, userId, runId, jobIndex) {
  try {
    logger.info(`[NaukriDirect] Navigating: ${job.title}`);
    await page.goto(job.href, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await delay(jitter(1500, 2000));

    // ── Extract company from detail page (far more reliable than search results) ─
    const detailCompany = await page.$$eval(
      'a.comp-name, [class*="comp-name"] a, [class*="comp-name"], [class*="companyName"] a, [class*="companyName"]',
      (els) => { for (const el of els) { const t = el.textContent?.trim(); if (t && t.length > 0 && t.length < 120) return t; } return ''; },
    ).catch(() => '');
    if (detailCompany) job.company = detailCompany;

    // ── Also grab title from detail page if SRP was truncated ───────────────
    const detailTitle = await page.$eval(
      'h1.title, .jd-header-title, [class*="job-title"] h1, h1[class*="title"]',
      (el) => el.textContent?.trim() || '',
    ).catch(() => '');
    if (detailTitle) job.title = detailTitle;

    // ── Extract location from detail page (more reliable than SRP card) ─────
    if (!job.location) {
      const detailLocation = await page.evaluate(() => {
        // Try <a href="/jobs-in-*"> links in the job header area
        const headerArea =
          document.querySelector('[class*="jd-header"]') ||
          document.querySelector('[class*="jobHeader"]') ||
          document.querySelector('.jd-header-ann-left') ||
          document.body;

        const locLinks = [...headerArea.querySelectorAll('a[href*="/jobs-in-"]')];
        if (locLinks.length) {
          return locLinks.map(l => l.textContent?.trim()).filter(Boolean).join(', ');
        }

        // Fallback: any element with location-like class
        const locEl = headerArea.querySelector(
          '[class*="location"], [class*="loc-links"], .loc a, ' +
          'span[itemprop="addressLocality"]',
        );
        return locEl?.textContent?.trim() || '';
      }).catch(() => '');

      if (detailLocation) job.location = detailLocation;
    }

    // ── Already applied? ────────────────────────────────────────────────────
    const alreadyEl = await page.$(MODAL_SEL.alreadyApplied).catch(() => null);
    if (alreadyEl) {
      const txt = (await alreadyEl.textContent())?.toLowerCase() || '';
      if (txt.includes('applied')) return { result: 'already_applied', message: 'Already applied', newFields: {} };
    }

    // ── Check for "Apply on Company Website" button first ────────────────────
    let externalBtn = null;
    for (const sel of EXTERNAL_BTN_SELS) {
      externalBtn = await page.$(sel).catch(() => null);
      if (externalBtn) break;
    }

    if (externalBtn) {
      // Open company website in a new tab and continue
      const [newPage] = await Promise.all([
        ctx.waitForEvent('page', { timeout: 8_000 }).catch(() => null),
        externalBtn.click(),
      ]);

      const externalUrl = newPage ? newPage.url() : (await externalBtn.getAttribute('href') || job.href);
      logger.info(`[NaukriDirect] External apply → ${externalUrl}`);

      // Keep the new tab open for user — don't close it
      return { result: 'external', message: 'Opened company website', externalUrl };
    }

    // ── Find the Naukri Apply button ─────────────────────────────────────────
    let applyBtn = null;
    for (const sel of NAUKRI_APPLY_BTN_SELS) {
      applyBtn = await page.$(sel).catch(() => null);
      if (applyBtn) break;
    }

    if (!applyBtn) {
      return { result: 'skipped', message: 'No Apply button found on page', newFields: {} };
    }

    const btnText = (await applyBtn.textContent())?.toLowerCase() || '';
    if (btnText.includes('applied') && !btnText.includes('apply now')) {
      return { result: 'already_applied', message: 'Already applied', newFields: {} };
    }

    // ── Click Apply and handle modal/popup ───────────────────────────────────
    // Listen for a new page in case the Apply button itself is an external link
    const [popup] = await Promise.all([
      ctx.waitForEvent('page', { timeout: 4_000 }).catch(() => null),
      applyBtn.click(),
    ]);

    if (popup) {
      // External redirect from the Apply button itself
      const externalUrl = popup.url();
      logger.info(`[NaukriDirect] Apply button opened external tab → ${externalUrl}`);
      return { result: 'external', message: 'Apply button opened company website', externalUrl };
    }

    // Naukri's own chatbot / quick-apply modal
    await delay(jitter(2000, 3000));
    return await handleNaukriModal(page, fieldMap, userId, runId, jobIndex);

  } catch (err) {
    logger.warn(`[NaukriDirect] Error on ${job.title}: ${err.message}`);
    return { result: 'failed', message: err.message, newFields: {} };
  }
}

/**
 * Walk through Naukri's chatbot-style apply modal.
 *
 * Each step:
 *   1. Fill known fields (CTC, notice, experience) by CSS selector.
 *   2. handleScreeningQuestions() — looks up cached answers for every other
 *      visible field, fills them, pauses for unknowns, and saves new answers
 *      to PostgreSQL for future runs.
 *   3. If any required question has no answer, skip submission for this job.
 *   4. Click Next (or Submit).
 */
async function handleNaukriModal(page, fieldMap, userId, runId, jobIndex) {
  const allCaptured = {};
  let submittedSuccessfully = false;

  // Labels already filled by fillKnownFields() — skip them in the Q&A pass
  const KNOWN_LABELS = [
    'notice period', 'current ctc', 'expected ctc',
    'relevant experience', 'total experience', 'location',
  ];

  const MAX_STEPS = 10;
  for (let step = 0; step < MAX_STEPS; step++) {
    // 1. Fill well-known preference fields by CSS selector (CTC, notice, etc.)
    await fillKnownFields(page, fieldMap);

    // 2. Q&A auto-fill — replaces the old replayAnswers + pause + captureAllAnswers
    const qaResult = await handleScreeningQuestions(page, userId, {
      qaService,
      resolveNewAnswer: makePauseResolver(page, USER_FILL_PAUSE),
      skipLabels:       KNOWN_LABELS,
      source:           PORTAL,
    });

    // Merge newly-captured answers into fieldMap so subsequent modal steps benefit
    for (const { label, answer } of qaResult.newlyCaptured) {
      const key = toKey(label);
      if (key) {
        allCaptured[key] = answer;
        fieldMap[key]    = answer;
      }
    }

    // Also run the old captureAllAnswers so existing MongoDB capturedFields
    // pipeline continues to work (belt-and-suspenders during migration).
    const raw        = await captureAllAnswers(page);
    const normalised = normaliseCapture(raw);
    Object.assign(allCaptured, raw, normalised);
    Object.assign(fieldMap, raw, normalised);

    // Defensive: never submit if a required screening question has no answer
    if (!qaResult.safeToSubmit) {
      const requiredMissing = qaResult.unfilled
        .filter((f) => f.required)
        .map((f) => f.label)
        .join(', ');
      logger.warn(`[NaukriDirect] Skipping job — unanswered required fields: ${requiredMissing}`);
      return {
        result:    'skipped',
        message:   `Required screening questions unanswered: ${requiredMissing}`,
        newFields: allCaptured,
      };
    }

    // Check for success before clicking anything
    const successEl = await page.$(MODAL_SEL.success).catch(() => null);
    if (successEl) { submittedSuccessfully = true; break; }

    // Try Submit button
    const submitBtn = await page.$(MODAL_SEL.submitBtn).catch(() => null);
    if (submitBtn) {
      const txt = (await submitBtn.textContent())?.toLowerCase() || '';
      if (txt.includes('submit') || txt.includes('apply')) {
        await submitBtn.click();
        await delay(jitter(2500, 4000));

        const success = await page.$(MODAL_SEL.success).catch(() => null);
        if (success) {
          submittedSuccessfully = true;
        } else {
          const url = page.url();
          submittedSuccessfully = url.includes('applied') || url.includes('success') || url.includes('myapps');
        }
        break;
      }
    }

    // Try Next button
    const nextBtn = await page.$(MODAL_SEL.nextBtn).catch(() => null);
    if (nextBtn) {
      await nextBtn.click();
      await delay(jitter(1000, 1500));
      continue;
    }

    // No more navigation — done
    submittedSuccessfully = true;
    break;
  }

  return {
    result:    submittedSuccessfully ? 'applied' : 'failed',
    message:   submittedSuccessfully ? 'Applied successfully' : 'Application flow completed without confirmation',
    newFields: allCaptured,
  };
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

async function setStep(runId, msg) {
  await AutomationRun.findByIdAndUpdate(runId, { $set: { 'summary.step': msg } }).catch(() => {});
}

async function writeJobResult(runId, idx, status, message, externalUrl = null) {
  const incKey = status === 'applied' || status === 'already_applied'
    ? 'summary.applied'
    : status === 'external'
    ? 'summary.external'
    : status === 'failed'
    ? 'summary.failed'
    : 'summary.skipped';

  await AutomationRun.findByIdAndUpdate(runId, {
    $set: {
      [`jobResults.${idx}.status`]:      status === 'already_applied' ? 'applied' : status,
      [`jobResults.${idx}.error`]:       status === 'failed' ? message : null,
      [`jobResults.${idx}.externalUrl`]: externalUrl,
      [`jobResults.${idx}.appliedAt`]:
        (status === 'applied' || status === 'already_applied') ? new Date() : null,
    },
    $inc: { [incKey]: 1 },
  }).catch(() => {});
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const runNaukriDirectApply = async ({
  userId, runId, username, password,
  keywords, location = '', maxJobs = 10, freshness = 0,
  prefs = {}, capturedFields = {}, resumeId,
}) => {
  let browser = null;

  try {
    logger.info(`[NaukriDirect] Starting run ${runId}`);

    const { browser: b, ctx } = await launchHeadedBrowser();
    browser = b;
    const page = await ctx.newPage();

    // ── Login ────────────────────────────────────────────────────────────────
    await setStep(runId, 'Opening Naukri and logging in…');

    const sessionLoaded = await loadSession(ctx, userId, PORTAL);
    if (sessionLoaded) {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await delay(jitter(1000, 1500));
    }

    if (!(await isLoggedIn(page))) {
      await doLogin(page, ctx, userId, username, password);
    } else {
      logger.info('[NaukriDirect] Session restored');
    }

    // ── Search ───────────────────────────────────────────────────────────────
    const searchUrl = buildSearchUrl(keywords, location, freshness, prefs.yearsOfExperience || 0);
    await setStep(runId, `Searching for "${keywords}" jobs on Naukri…`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await delay(jitter(2000, 3000));

    const jobs = await extractJobsFromSRP(page, maxJobs);

    if (!jobs.length) {
      await AutomationRun.findByIdAndUpdate(runId, {
        $set: { status: 'completed', completedAt: new Date(), 'summary.step': 'No matching jobs found.' },
      }).catch(() => {});
      return;
    }

    // Initialise jobResults rows in the DB
    await AutomationRun.findByIdAndUpdate(runId, {
      $set: {
        jobResults: jobs.map((j) => ({
          title: j.title, company: j.company, status: 'queued',
        })),
        'summary.total': jobs.length,
        'summary.step': `Found ${jobs.length} jobs — starting applications…`,
      },
    }).catch(() => {});

    // Working field map — grows as the user fills in unknowns
    const fieldMap = buildFieldMap(prefs, capturedFields);
    const externalJobsRecord = [];

    // ── Apply loop ───────────────────────────────────────────────────────────
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      await setStep(runId, `Job ${i + 1}/${jobs.length}: "${job.title}" @ ${job.company || 'Unknown'}`);

      const { result, message, externalUrl, newFields } = await applyToJob(
        page, ctx, job, fieldMap, userId, runId, i,
      );

      // Persist result
      await writeJobResult(runId, i, result, message, externalUrl || null);

      if (result === 'external' && externalUrl) {
        externalJobsRecord.push({ title: job.title, company: job.company, applyUrl: job.href, externalUrl });
        await AutomationRun.findByIdAndUpdate(runId, {
          $push: { externalJobs: { title: job.title, company: job.company, applyUrl: job.href, externalUrl } },
        }).catch(() => {});
      }

      // Save and reuse any newly captured fields
      if (newFields && Object.keys(newFields).length) {
        Object.assign(fieldMap, newFields);    // use immediately for next job
        Object.assign(capturedFields, newFields);

        // Persist to AutomationCredentials and AutomationRun
        await saveDiscoveredFields(userId, PORTAL, newFields);
        await AutomationRun.findByIdAndUpdate(runId, {
          $set: Object.fromEntries(
            Object.entries(newFields).map(([k, v]) => [`capturedFields.${k}`, v]),
          ),
        }).catch(() => {});
      }

      // Record in CareerSync Applications collection
      if (result === 'applied' || result === 'already_applied' || result === 'external') {
        try {
          const jobSet = {
            title:   job.title,
            company: job.company || 'Unknown',
          };
          if (job.location) jobSet.location = job.location;

          const jobDoc = await Job.findOneAndUpdate(
            { source: PORTAL, applyUrl: job.href },
            {
              $set: jobSet,
              $setOnInsert: {
                source: PORTAL, applyUrl: job.href, externalId: job.href,
                location: '', isActive: true, postedAt: new Date(),
              },
            },
            { upsert: true, new: true },
          );

          const isExternal = result === 'external';
          await Application.findOneAndUpdate(
            { userId, jobId: jobDoc._id },
            {
              $set: {
                userId,
                jobId:           jobDoc._id,
                resumeId,
                naukriJobId:     extractNaukriJobId(job.href),
                applyType:       isExternal ? 'company_site' : 'platform',
                manualApply:     isExternal,
                companyApplyUrl: isExternal ? (externalUrl || null) : null,
                status:          isExternal ? 'pending_manual' : 'applied',
                source:          'auto',
                appliedAt:       isExternal ? null : new Date(),
                _statusNote:     isExternal
                  ? `Company-site job queued for manual apply: ${externalUrl || job.href}`
                  : `Auto-applied via Naukri bot (run ${runId})`,
              },
            },
            { upsert: true },
          );
        } catch {}
      }

      await delay(jitter(BETWEEN_JOBS_MIN, BETWEEN_JOBS_MAX));
    }

    // ── Complete ─────────────────────────────────────────────────────────────
    const finalRun = await AutomationRun.findById(runId).lean();
    const s = finalRun?.summary || {};
    const completionMsg = externalJobsRecord.length
      ? `Done! ${s.applied ?? 0} applied · ${externalJobsRecord.length} external tabs left open for you to apply manually.`
      : `Done! ${s.applied ?? 0} applied · ${s.skipped ?? 0} skipped · ${s.failed ?? 0} failed.`;

    await AutomationRun.findByIdAndUpdate(runId, {
      $set: { status: 'completed', completedAt: new Date(), 'summary.step': completionMsg },
    }).catch(() => {});

    // Show a summary overlay in the browser
    if (externalJobsRecord.length > 0) {
      try {
        const summaryPage = await ctx.newPage();
        await summaryPage.setContent(`
          <!DOCTYPE html><html><head>
            <title>CareerSync — Automation Complete</title>
            <style>
              body { font-family: system-ui; max-width: 700px; margin: 60px auto; padding: 0 20px; color: #1a1a1a; }
              h1 { color: #2563eb; }
              .stat { display: inline-block; background: #f0f9ff; border: 1px solid #bfdbfe;
                      border-radius: 8px; padding: 12px 20px; margin: 8px; text-align: center; }
              .stat span { display: block; font-size: 28px; font-weight: 700; color: #1d4ed8; }
              .jobs { margin-top: 24px; }
              .job { padding: 10px 14px; margin: 8px 0; background: #fff7ed;
                     border: 1px solid #fed7aa; border-radius: 8px; }
              .job strong { color: #c2410c; }
              .note { margin-top: 24px; padding: 14px; background: #ecfdf5;
                      border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; }
            </style>
          </head><body>
            <h1>Automation Complete</h1>
            <div>
              <div class="stat"><span>${s.applied ?? 0}</span>Applied by bot</div>
              <div class="stat"><span>${externalJobsRecord.length}</span>Needs manual apply</div>
              <div class="stat"><span>${s.skipped ?? 0}</span>Skipped</div>
            </div>
            <div class="jobs">
              <h2>Manual Applications Needed</h2>
              <p>These company websites are open in the other tabs — apply to them manually:</p>
              ${externalJobsRecord.map((j) => `
                <div class="job">
                  <strong>${j.title}</strong> &nbsp;@&nbsp; ${j.company || '—'}
                </div>
              `).join('')}
            </div>
            <div class="note">
              ✅ Close this window when you have finished applying to all the tabs above.
              All session data has been saved — the next run will be faster.
            </div>
          </body></html>
        `);
      } catch {}
    }

    logger.info(`[NaukriDirect] Run ${runId} complete`);

    // Keep browser open until the user closes it (or 45-min safety timeout)
    await new Promise((resolve) => {
      browser.on('disconnected', resolve);
      setTimeout(resolve, 45 * 60 * 1000);
    });

  } catch (err) {
    logger.error(`[NaukriDirect] Run ${runId} error: ${err.message}`);
    await AutomationRun.findByIdAndUpdate(runId, {
      $set: { status: 'failed', error: err.message, completedAt: new Date(),
              'summary.step': `Failed: ${err.message}` },
    }).catch(() => {});
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};
