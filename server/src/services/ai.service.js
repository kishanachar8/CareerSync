import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import env from '../config/env.js';
import redis from '../config/redis.js';
import { extractSkills } from '../utils/skillExtractor.js';
import logger from '../utils/logger.js';

const CACHE_TTL = 24 * 60 * 60; // 24 hours
const MODEL     = 'gemini-1.5-flash';

const getClient = () => {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured. Add GEMINI_API_KEY to your .env file.');
  }
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
};

function friendlyGeminiError(err) {
  const msg = err.message || '';
  const lower = msg.toLowerCase();
  logger.warn(`[AI] Raw Gemini error: ${msg}`);

  // Invalid / malformed API key — check BEFORE quota so a bad key isn't reported as quota
  if (
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('invalid_argument') ||
    lower.includes('invalid api key') ||
    (msg.includes('400') && lower.includes('api key'))
  ) return 'Invalid Gemini API key. Check that GEMINI_API_KEY in your .env starts with "AIza" and was copied from aistudio.google.com.';

  if (msg.includes('429') || lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource_exhausted'))
    return 'Gemini quota exceeded. Please check your usage at aistudio.google.com or wait before retrying.';

  if (msg.includes('503') || lower.includes('unavailable') || lower.includes('overloaded'))
    return 'Gemini is currently overloaded. Please try again in a few seconds.';

  return `AI service error: ${msg}`;
}

const cacheKey = (prefix, ...parts) =>
  `ai:${prefix}:${crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)}`;

const getCached = async (key) => {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const setCache = async (key, value) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL);
  } catch { /* non-fatal */ }
};

async function generateJSON(prompt, { temperature = 0.3, maxOutputTokens = 1000 } = {}) {
  const genAI = getClient();
  // Use stable v1 endpoint — v1beta doesn't expose gemini-1.5-flash for all API keys
  const model = genAI.getGenerativeModel(
    {
      model: MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature,
        maxOutputTokens,
      },
    },
    { apiVersion: 'v1' },
  );
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  // Strip potential markdown code fences before parsing
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Model did not return JSON. Raw response: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[0]);
}

// ─── Resume Analysis ──────────────────────────────────────────────────────────

export const analyseResume = async ({ resumeText, jobTitle, jobDescription, jobSkills = [] }) => {
  const key = cacheKey('analyse', resumeText.slice(0, 200), jobTitle, jobDescription.slice(0, 200));
  const cached = await getCached(key);
  if (cached) return { ...cached, cached: true };

  if (!env.GEMINI_API_KEY) {
    return keywordFallback(resumeText, jobSkills, null);
  }

  const prompt = `You are an expert ATS (Applicant Tracking System) and technical recruiter.

Analyse this resume against the job posting and respond with a JSON object only — no markdown, no explanation.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 4000)}

Return exactly this JSON structure:
{
  "matchScore": <integer 0-100>,
  "recommendation": <"strong_apply" | "apply" | "consider" | "skip">,
  "summary": <2-3 sentence overall assessment>,
  "matchedSkills": [<skills present in both resume and job>],
  "missingSkills": [<important skills the resume lacks>],
  "strengths": [<3-5 specific strengths relevant to this role>],
  "improvements": [<3-5 actionable resume improvements for this role>],
  "experienceAlignment": <brief note on experience level fit>
}`;

  try {
    const result = await generateJSON(prompt, { temperature: 0.3, maxOutputTokens: 1000 });
    await setCache(key, result);
    logger.info(`[AI] Resume analysis complete — score: ${result.matchScore}`);
    return result;
  } catch (err) {
    const reason = friendlyGeminiError(err);
    logger.warn(`[AI] analyseResume Gemini failed — ${reason}`);
    return keywordFallback(resumeText, jobSkills, reason);
  }
};

// ─── Cover Letter Generation ──────────────────────────────────────────────────

export const generateCoverLetter = async ({
  userName,
  jobTitle,
  company,
  jobDescription,
  resumeSummary,
  tone = 'professional',
}) => {
  const key = cacheKey('cover', userName, jobTitle, company, tone, resumeSummary.slice(0, 200));
  const cached = await getCached(key);
  if (cached) return { ...cached, cached: true };

  if (!env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is required for cover letter generation.');
  }

  const toneGuide = {
    professional: 'formal, confident, and polished',
    enthusiastic: 'warm, energetic, and genuinely excited about the role',
    concise: 'direct, brief, and results-focused — no filler sentences',
  };

  const prompt = `You are an expert career coach who writes compelling cover letters.

Write a cover letter for ${userName} applying to the ${jobTitle} position at ${company}.
Tone: ${toneGuide[tone] || toneGuide.professional}

JOB DESCRIPTION (excerpt):
${jobDescription.slice(0, 2000)}

CANDIDATE BACKGROUND (from resume):
${resumeSummary.slice(0, 1500)}

Guidelines:
- 3-4 paragraphs, under 350 words
- Do NOT use generic phrases like "I am excited to apply" or "I believe I am a great fit"
- Reference specific skills and experiences that directly match the role
- End with a clear call to action

Respond with JSON only: { "coverLetter": "<the full cover letter text>" }`;

  try {
    const result = await generateJSON(prompt, { temperature: 0.7, maxOutputTokens: 800 });
    await setCache(key, result);
    logger.info(`[AI] Cover letter generated for ${userName} → ${jobTitle} at ${company}`);
    return result;
  } catch (err) {
    logger.error(`[AI] generateCoverLetter failed: ${err.message}`);
    throw new Error(friendlyGeminiError(err));
  }
};

// ─── Skill Gap Analysis ───────────────────────────────────────────────────────

export const analyseSkillGap = async ({ currentSkills, targetRole, jobDescription = '' }) => {
  const key = cacheKey('skillgap', currentSkills.sort().join(','), targetRole);
  const cached = await getCached(key);
  if (cached) return { ...cached, cached: true };

  if (!env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is required for skill gap analysis.');
  }

  const prompt = `You are a technical career advisor helping software professionals grow.

Analyse the skill gap between the candidate's current skills and the target role.

TARGET ROLE: ${targetRole}
${jobDescription ? `ROLE DESCRIPTION:\n${jobDescription.slice(0, 1500)}\n` : ''}
CURRENT SKILLS: ${currentSkills.join(', ')}

Respond with JSON only:
{
  "missingSkills": [<skills needed for the role that the candidate lacks, prioritised>],
  "niceToHaveSkills": [<skills that would strengthen candidacy but aren't blockers>],
  "strengths": [<current skills that are highly relevant to this role>],
  "learningPath": [
    { "skill": <skill name>, "priority": <"high"|"medium"|"low">, "estimatedWeeks": <integer>, "resources": [<1-2 free resource names or types>] }
  ],
  "readinessScore": <integer 0-100 — how ready is the candidate today>,
  "timeToReady": <e.g. "3-4 months with focused learning">
}`;

  try {
    const result = await generateJSON(prompt, { temperature: 0.4, maxOutputTokens: 1200 });
    await setCache(key, result);
    logger.info(`[AI] Skill gap analysis done — readiness: ${result.readinessScore}%`);
    return result;
  } catch (err) {
    logger.error(`[AI] analyseSkillGap failed: ${err.message}`);
    throw new Error(friendlyGeminiError(err));
  }
};

// ─── Keyword fallback (when AI is unavailable) ────────────────────────────────

function keywordFallback(resumeText, jobSkills, errorReason = null) {
  const resumeSkills = new Set(extractSkills(resumeText).map((s) => s.toLowerCase()));
  const jSkills = jobSkills.map((s) => s.toLowerCase());
  const matched = jSkills.filter((s) => resumeSkills.has(s));
  const missing = jSkills.filter((s) => !resumeSkills.has(s));
  const matchScore = jSkills.length > 0 ? Math.round((matched.length / jSkills.length) * 100) : 0;

  const summaryNote = errorReason
    ? `Keyword-based analysis only (AI unavailable: ${errorReason})`
    : 'Keyword-based analysis only (no Gemini API key configured).';

  const improvementNote = errorReason
    ? `AI analysis unavailable: ${errorReason}`
    : 'Add GEMINI_API_KEY to your .env for detailed AI analysis';

  return {
    matchScore,
    recommendation: matchScore >= 70 ? 'apply' : matchScore >= 40 ? 'consider' : 'skip',
    summary: `${summaryNote} ${matched.length} of ${jSkills.length} required skills matched.`,
    matchedSkills: matched,
    missingSkills: missing,
    strengths: [],
    improvements: [improvementNote],
    experienceAlignment: 'Unavailable without AI analysis',
    fallback: true,
    fallbackReason: errorReason,
  };
}
