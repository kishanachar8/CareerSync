/**
 * handleScreeningQuestions — orchestrates Q&A auto-fill for one modal step.
 *
 * Flow:
 *   1. Load all cached answers for the user (one DB query per call).
 *   2. Scrape all visible fields from the current modal step.
 *   3. For each field:
 *        (a) Try exact/fuzzy match → fill.
 *        (b) No match → call resolveNewAnswer() → fill → save for next time.
 *   4. Refuse to mark safeToSubmit if any REQUIRED field has no answer.
 *
 * ── resolveNewAnswer callback ─────────────────────────────────────────────────
 * Signature: async (field: Field) => string | null
 * Return null or '' to skip the field.
 *
 * Two built-in resolvers are exported:
 *   makePauseResolver(page, waitMs)  — pauses and reads what the user typed
 *   makeLlmResolver(fn)              — delegates to any LLM function you wire up
 *
 * ── skipLabels ────────────────────────────────────────────────────────────────
 * Pass normalized label strings that are already handled by fillKnownFields()
 * (notice period, CTC, etc.) to avoid double-filling.
 */

import { findAll, upsertAnswer } from './db.js';
import { findMatch, normalize }  from './normalize.js';
import { scrapeQuestions, fillField, CONFIG } from './scraper.js';
import { validateAnswer } from './qaService.js';
import logger from '../../utils/logger.js';

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * @param {import('playwright').Page} page
 * @param {string|ObjectId} userId
 * @param {object}   options
 * @param {object}   [options.qaService]        MongoDB service (preferred)
 *                                              from server/src/automation/qa/qaService.js
 * @param {object}   [options.db]               PostgreSQL adapter (legacy)
 * @param {Function} [options.resolveNewAnswer] async (field) => string | null
 * @param {string[]} [options.skipLabels]       labels already handled by fillKnownFields()
 * @param {string}   [options.source]           portal name (default 'naukri')
 *
 * @returns {Promise<{
 *   filled:        Array<{ label, answer, matchType, confidence }>,
 *   newlyCaptured: Array<{ label, answer }>,
 *   unfilled:      Array<{ label, required }>,
 *   safeToSubmit:  boolean
 * }>}
 */
export async function handleScreeningQuestions(page, userId, {
  qaService,
  db,
  resolveNewAnswer,
  skipLabels = [],
  source     = 'naukri',
}) {
  const filled        = [];
  const newlyCaptured = [];
  const unfilled      = [];

  const skipSet = new Set(skipLabels.map((l) => normalize(l)));

  // ── Load all answers (one round-trip) ─────────────────────────────────────
  // qaService (MongoDB) takes priority over the legacy PostgreSQL db adapter.
  const allAnswers = qaService
    ? await qaService.loadAll(String(userId), source)
    : await findAll(db, String(userId));

  const fields = await scrapeQuestions(page);

  for (const field of fields) {
    const normLabel = normalize(field.label);
    if (skipSet.has(normLabel)) continue;

    const { answer, matchType, confidence } = findMatch(field.label, allAnswers);

    if (answer !== null) {
      // ── Known answer — validate for choice fields before filling ──────────
      const valid = validateAnswer(answer, field);
      if (!valid) {
        // Stored option no longer exists in this form (Naukri changed choices)
        unfilled.push({ label: field.label, required: field.required });
        continue;
      }

      const ok = await fillField(page, field, answer);
      if (ok) {
        filled.push({ label: field.label, answer, matchType, confidence });
        // Bump usage counter asynchronously (non-blocking)
        qaService?.incrementUsage(String(userId), normLabel, source);
      } else {
        unfilled.push({ label: field.label, required: field.required });
      }

    } else {
      // ── Unknown question → ask resolver ───────────────────────────────────
      let resolved = null;
      if (typeof resolveNewAnswer === 'function') {
        resolved = await resolveNewAnswer(field).catch(() => null);
      }

      if (resolved !== null && resolved !== undefined && String(resolved).trim() !== '') {
        const ok = await fillField(page, field, String(resolved));
        if (ok) {
          const saveData = {
            questionText:   field.label,
            normalizedText: normLabel,
            answer:         String(resolved),
            fieldType:      field.fieldType,
            options:        field.options,
            source,
            confidence:     0,   // 0 = manually entered this run
          };
          try {
            if (qaService) {
              await qaService.saveAnswer(String(userId), saveData);
            } else if (db) {
              await upsertAnswer(db, String(userId), saveData);
            }
          } catch (saveErr) {
            logger.warn(`[QA] Could not save answer for "${field.label}": ${saveErr.message}`);
          }
          newlyCaptured.push({ label: field.label, answer: resolved });
          filled.push({ label: field.label, answer: resolved, matchType: 'new', confidence: 0 });
        } else {
          unfilled.push({ label: field.label, required: field.required });
        }
      } else {
        unfilled.push({ label: field.label, required: field.required });
      }
    }
  }

  const safeToSubmit = !unfilled.some((f) => f.required);
  return { filled, newlyCaptured, unfilled, safeToSubmit };
}

// ─── Built-in resolvers ───────────────────────────────────────────────────────

/**
 * Pause resolver: waits `waitMs` milliseconds for the user to fill the field
 * in the visible browser window, then reads back whatever they typed.
 *
 * This mirrors the existing USER_FILL_PAUSE behaviour in naukri.directApply.js.
 *
 * @param {import('playwright').Page} page
 * @param {number} waitMs  Default: 8 000 ms
 */
export function makePauseResolver(page, waitMs = 8_000) {
  return async (field) => {
    await new Promise((r) => setTimeout(r, waitMs));

    return page.evaluate(
      ({ label, fieldType, modalRoots, questionContainers, labelWalkDepth, textInputSel }) => {
        // Find modal root
        let root = document.body;
        for (const sel of modalRoots) {
          const el = document.querySelector(sel);
          if (el) { root = el; break; }
        }

        // Full label-finder — same logic as scraper.js so label matching is consistent
        const qContainerSel = questionContainers.map((c) => `[class*="${c}"]`).join(',');
        function findLabel(el) {
          if (el.id) {
            try {
              const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
              if (lbl?.textContent?.trim()) return lbl.textContent.trim();
            } catch {}
          }
          let node = el.parentElement;
          for (let i = 0; i < labelWalkDepth && node; i++, node = node.parentElement) {
            const qEl = node.querySelector(qContainerSel);
            if (qEl?.textContent?.trim()) return qEl.textContent.trim();
            const lbl = node.querySelector('label, legend');
            if (lbl && lbl !== el && lbl.textContent.trim().length < 200) return lbl.textContent.trim();
            if (/form[-_]?field|field[-_]?group|widget|question|form[-_]?row/i.test(node.className || '')) break;
          }
          return el.getAttribute('aria-label') || el.placeholder || el.getAttribute('title') || '';
        }

        const labelNorm = label.toLowerCase().trim();

        if (fieldType === 'text' || fieldType === 'textarea') {
          // First pass: match by full label (handles Naukri's chatbot-ques structure)
          for (const el of root.querySelectorAll(textInputSel)) {
            if (!el.offsetParent) continue;
            const elLabel = findLabel(el).toLowerCase().trim();
            if (elLabel && (elLabel === labelNorm || elLabel.includes(labelNorm) || labelNorm.includes(elLabel))) {
              return el.value?.trim() || null;
            }
          }
          // Fallback: any filled visible input (chatbot shows one question at a time)
          for (const el of root.querySelectorAll(textInputSel)) {
            if (!el.offsetParent) continue;
            const val = el.value?.trim();
            if (val) return val;
          }
        }

        if (fieldType === 'select') {
          for (const el of root.querySelectorAll('select')) {
            if (!el.offsetParent) continue;
            const elLabel = findLabel(el).toLowerCase().trim();
            if (elLabel && !elLabel.includes(labelNorm) && !labelNorm.includes(elLabel)) continue;
            const text = el.selectedIndex >= 0 ? el.options[el.selectedIndex]?.text?.trim() : null;
            if (text && !/^select|^choose|^--/i.test(text)) return text;
          }
        }

        if (fieldType === 'radio') {
          for (const el of root.querySelectorAll('input[type="radio"]:checked')) {
            if (!el.offsetParent) continue;
            const lbl = el.closest('label') ||
              (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
            const text = lbl?.textContent?.trim() || el.value;
            if (text) return text;
          }
        }

        return null;
      },
      {
        label:              field.label,
        fieldType:          field.fieldType,
        modalRoots:         CONFIG.modalRoots,
        questionContainers: CONFIG.questionContainers,
        labelWalkDepth:     CONFIG.labelWalkDepth,
        textInputSel:       CONFIG.textInputSel,
      },
    );
  };
}

/**
 * LLM resolver: delegates to any async function that returns a string answer.
 *
 * Usage example (swap in your actual LLM call):
 *
 *   const resolveWithLlm = makeLlmResolver(async (field) => {
 *     const { GoogleGenerativeAI } = await import('@google/generative-ai');
 *     const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
 *     const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
 *     const result = await model.generateContent(
 *       `Answer this job application screening question concisely.\n` +
 *       `Question: ${field.label}\n` +
 *       (field.options.length ? `Options: ${field.options.join(', ')}` : ''),
 *     );
 *     return result.response.text()?.trim() ?? null;
 *   });
 *
 *   await handleScreeningQuestions(page, userId, { db, resolveNewAnswer: resolveWithLlm });
 *
 * @param {Function} llmFn  async (field: Field) => string | null
 */
export function makeLlmResolver(llmFn) {
  return async (field) => {
    try {
      return await llmFn(field);
    } catch {
      return null;   // LLM failure → field stays unfilled, not a hard crash
    }
  };
}
