/**
 * Question-text normalisation and cached-answer lookup with fuzzy fallback.
 *
 * Matching order (mirrors the Lookup Order spec):
 *   (a) Exact SHA-256 match on normalize(text)        → confidence = 1.0
 *   (b) Levenshtein similarity above FUZZY_THRESHOLD  → confidence = similarity ratio
 *   (c) No match — treat as new question              → confidence = 0
 *
 * ── EMBEDDINGS HOOK ──────────────────────────────────────────────────────────
 * The fuzzy fallback in findMatch() is the one place to swap in vector
 * similarity when you're ready.  Steps:
 *
 *   1. Implement an embed function:
 *        async function embed(text) { ... }  // returns number[]
 *
 *   2. Implement cosine similarity:
 *        function cosineSim(a, b) {
 *          const dot   = a.reduce((s, v, i) => s + v * b[i], 0);
 *          const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
 *          const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
 *          return dot / (normA * normB);
 *        }
 *
 *   3. Replace the Levenshtein block in findMatch() with:
 *        const normQ = normalize(questionText);
 *        const embQ  = await embed(normQ);
 *        for (const row of allAnswers) {
 *          const score = cosineSim(embQ, await embed(normalize(row.question_text)));
 *          if (score > bestScore) { bestScore = score; bestRow = row; }
 *        }
 *
 *   4. findMatch() is already async — no other callers need changing.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createHash } from 'node:crypto';

// ─── Text normalisation ───────────────────────────────────────────────────────

/**
 * Canonical form used for hashing and fuzzy comparison.
 * "What is your Notice Period?" → "what is your notice period"
 */
export function normalize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')   // strip all punctuation → space
    .replace(/\s+/g, ' ')       // collapse runs of whitespace
    .trim();
}

/** SHA-256 hex of normalize(text). */
export function hashNormalized(text) {
  return createHash('sha256').update(normalize(text)).digest('hex');
}

// ─── Levenshtein distance (O(n) space) ───────────────────────────────────────

function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** 0 = completely different, 1 = identical */
function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

// ─── Confidence threshold ─────────────────────────────────────────────────────
// 0.82 catches common rephrasing:
//   "What is your notice period?" ↔ "Notice period?"      → ~0.84 ✓
//   "Current CTC (in Lakhs)"      ↔ "Current CTC"         → ~0.83 ✓
// While rejecting false positives on short different questions:
//   "City"  ↔ "Country"                                   → ~0.57 ✗
const FUZZY_THRESHOLD = 0.82;

// ─── Main lookup ──────────────────────────────────────────────────────────────

/**
 * Find the best cached answer for a question label.
 *
 * @param {string}   questionText  Raw label text scraped from the form.
 * @param {object[]} allAnswers    Decrypted rows from db.findAll(db, userId).
 *                                 Each row has: question_hash, question_text, answer.
 *
 * @returns {{ answer: string|null, matchType: 'exact'|'fuzzy'|null, confidence: number }}
 */
export function findMatch(questionText, allAnswers) {
  if (!allAnswers.length) return { answer: null, matchType: null, confidence: 0 };

  const norm = normalize(questionText);
  const hash = createHash('sha256').update(norm).digest('hex');

  // (a) Exact hash match — O(n) scan but rows are pre-sorted newest-first
  const exact = allAnswers.find((r) => r.question_hash === hash);
  if (exact) return { answer: exact.answer, matchType: 'exact', confidence: 1 };

  // (b) Levenshtein fuzzy fallback
  //     ── EMBEDDINGS HOOK: replace these 6 lines with vector similarity (see top) ──
  let bestScore = 0;
  let bestRow   = null;
  for (const row of allAnswers) {
    const score = similarity(norm, normalize(row.question_text));
    if (score > bestScore) { bestScore = score; bestRow = row; }
  }
  if (bestRow && bestScore >= FUZZY_THRESHOLD) {
    return { answer: bestRow.answer, matchType: 'fuzzy', confidence: bestScore };
  }

  // (c) New question
  return { answer: null, matchType: null, confidence: 0 };
}
