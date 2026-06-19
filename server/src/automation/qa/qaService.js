/**
 * MongoDB-native service for screening-question answers.
 *
 * Wraps ScreeningAnswer (Mongoose) with the same interface the orchestrator
 * expects, so no PostgreSQL dependency is needed.
 *
 * Public API
 * ──────────
 *  loadAll(userId, source?)       → row[]   (decrypted, ready for findMatch)
 *  saveAnswer(userId, data)       → void
 *  incrementUsage(userId, norm, source?)  → void   (fire-and-forget)
 *  validateAnswer(storedAnswer, field)    → boolean
 *
 * Row shape (compatible with normalize.findMatch):
 *  { question_hash, question_text, answer, field_type, options }
 */

import { createHash } from 'node:crypto';
import ScreeningAnswer  from '../../models/ScreeningAnswer.js';
import { normalize }    from './normalize.js';
import { encrypt, decrypt } from './encrypt.js';

// ─── Encrypt / decrypt helpers ────────────────────────────────────────────────

// JSON-wrap before encrypt so Mixed types (number, boolean, array) survive
// the round-trip without type loss.
function encryptAnswer(value) {
  return encrypt(JSON.stringify(value));
}

function decryptAnswer(ciphertext) {
  try {
    return JSON.parse(decrypt(ciphertext));
  } catch {
    // Gracefully handle answers saved before encryption was enabled
    return ciphertext;
  }
}

// ─── Row adapter ──────────────────────────────────────────────────────────────

// Convert a Mongoose lean doc to the shape normalize.findMatch expects.
// question_hash = SHA-256(normalizedQuestion) — matches what findMatch computes.
function toRow(doc) {
  return {
    question_hash: createHash('sha256').update(doc.normalizedQuestion).digest('hex'),
    question_text: doc.questionText,
    answer:        decryptAnswer(doc.answer),
    field_type:    doc.questionType,
    options:       doc.options ?? [],
    _id:           doc._id,
    normalizedQuestion: doc.normalizedQuestion,
  };
}

// ─── loadAll ──────────────────────────────────────────────────────────────────

/**
 * Fetch every stored answer for a user+portal.
 * Called ONCE per handleScreeningQuestions() invocation; matching is done
 * in-memory by normalize.findMatch() so there's only one DB round-trip.
 *
 * @returns {object[]} decrypted row array
 */
export async function loadAll(userId, source = 'naukri') {
  const docs = await ScreeningAnswer.find(
    { userId, source },
    'questionText normalizedQuestion answer questionType options',
  ).lean();
  return docs.map(toRow);
}

// ─── saveAnswer ───────────────────────────────────────────────────────────────

/**
 * Insert or update an answer.
 * Re-encrypts on every upsert so the IV is always fresh.
 *
 * @param {string|ObjectId} userId
 * @param {{
 *   questionText:   string,
 *   normalizedText: string,
 *   answer:         any,
 *   fieldType?:     string,
 *   options?:       string[],
 *   source?:        string,
 *   confidence?:    number,
 * }} data
 */
export async function saveAnswer(userId, {
  questionText,
  normalizedText,
  answer,
  fieldType  = 'text',
  options    = [],
  source     = 'naukri',
  confidence = 1,
}) {
  const norm = normalizedText || normalize(questionText);
  await ScreeningAnswer.findOneAndUpdate(
    { userId, normalizedQuestion: norm, source },
    {
      $set: {
        questionText,
        normalizedQuestion: norm,
        answer:             encryptAnswer(answer),
        questionType:       fieldType,
        options,
        source,
        confidence,
      },
      $setOnInsert: { usageCount: 0 },
    },
    { upsert: true, new: true },
  );
}

// ─── incrementUsage ───────────────────────────────────────────────────────────

/**
 * Increment usageCount after a successful auto-fill.
 * Non-critical — failures are swallowed silently.
 */
export async function incrementUsage(userId, normalizedQuestion, source = 'naukri') {
  ScreeningAnswer.updateOne(
    { userId, normalizedQuestion, source },
    { $inc: { usageCount: 1 } },
  ).catch(() => {});
}

// ─── validateAnswer ───────────────────────────────────────────────────────────

/**
 * For radio / dropdown / checkbox fields: verify the stored answer is still
 * among the current option labels before auto-filling.
 *
 * Returns true for free-text fields (nothing to validate).
 *
 * @param {any}      storedAnswer  plaintext value from loadAll()
 * @param {{ fieldType: string, options: string[] }} field  scraped field object
 */
export function validateAnswer(storedAnswer, field) {
  if (!['radio', 'dropdown', 'checkbox', 'select'].includes(field.fieldType)) return true;
  if (!field.options?.length) return true;

  const opts = field.options.map((o) => o.toLowerCase());

  // Array answer (checkbox multi-select)
  if (Array.isArray(storedAnswer)) {
    return storedAnswer.some((v) => opts.some((o) => o.includes(String(v).toLowerCase())));
  }

  const ans = String(storedAnswer).toLowerCase();
  return opts.some((o) => o === ans || o.includes(ans));
}

// ─── Convenience: find a single answer ───────────────────────────────────────

/**
 * One-shot helper (wraps loadAll + findMatch) for callers that look up a single
 * question at a time (e.g., tests or manual-trigger scripts).
 * For bulk use inside handleScreeningQuestions, use loadAll() + findMatch() directly.
 *
 * @param {string|ObjectId} userId
 * @param {string}          questionText
 * @param {string}          [source]
 * @returns {{ answer, matchType, confidence } | null}
 */
export async function findAnswer(userId, questionText, source = 'naukri') {
  const { findMatch } = await import('./normalize.js');
  const rows   = await loadAll(userId, source);
  const result = findMatch(questionText, rows);
  return result.matchType ? result : null;
}
