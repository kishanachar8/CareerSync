/**
 * Playwright-based form question scraper and field filler for Naukri's apply modal.
 *
 * ── NOTE: PLAYWRIGHT vs PUPPETEER ────────────────────────────────────────────
 * This codebase uses Playwright (chromium from 'playwright'), not Puppeteer.
 * The APIs are nearly identical for page.evaluate() but differ for element
 * interaction.  If you ever need to port:
 *
 *   Playwright                       Puppeteer equivalent
 *   ─────────────────────────────    ──────────────────────────────────────
 *   page.evaluate(fn, args)          page.evaluate(fn, ...args)
 *   page.locator(sel).fill(v)        await (await page.$(sel)).type(v)
 *   page.locator(sel).check()        await (await page.$(sel)).click()
 *   locator.selectOption(value)      page.select(sel, value)
 *
 * All DOM mutations below use the React-compatible setNative pattern (override
 * via the prototype's native value setter, then fire input + change events) so
 * Naukri's React-controlled inputs register the change correctly.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PUBLIC API
 *   scrapeQuestions(page)              → Promise<Field[]>
 *   fillField(page, field, answer)     → Promise<boolean>   (true = filled OK)
 *
 * Field shape:
 *   { label: string, fieldType: FieldType, options: string[], required: boolean }
 *
 * FieldType: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Change any selector here when Naukri's DOM structure shifts.

export const CONFIG = {
  // Ordered: first matching element becomes the root we search within.
  modalRoots: [
    '[class*="chatbot"]',
    '[class*="applyModal"]',
    '[class*="apply-modal"]',
    '[class*="apply-form"]',
    'form[class*="apply"]',
    'form',
    'body',
  ],

  // Class-name fragments used to find Naukri's question-label elements.
  // Each entry is used as: [class*="<entry>"]
  questionContainers: [
    'chatbot-ques',
    'chatbotQues',
    'ssrc__ques',
    'question-label',
    'questionLabel',
    'question',
  ],

  // How many parent nodes to walk up from an input looking for a label.
  labelWalkDepth: 6,

  // CSS selector for visible text/number/email/tel inputs + textareas
  // (radio + checkbox + select are handled separately).
  textInputSel:
    'input:not([type="hidden"]):not([type="submit"]):not([type="file"])' +
    ':not([type="radio"]):not([type="checkbox"]):not([type="button"]), textarea',
};

// ─── scrapeQuestions ──────────────────────────────────────────────────────────

/**
 * Read all visible form fields from the current modal step.
 *
 * Runs inside page.evaluate() so it has no access to Node modules.
 * Returns a plain-JSON array safe for serialization.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<Array<{ label: string, fieldType: string, options: string[], required: boolean }>>}
 */
export async function scrapeQuestions(page) {
  return page.evaluate(
    ({ modalRoots, questionContainers, labelWalkDepth, textInputSel }) => {
      // ── Find modal root ────────────────────────────────────────────────────
      let root = document.body;
      for (const sel of modalRoots) {
        const el = document.querySelector(sel);
        if (el) { root = el; break; }
      }

      // ── Label-finder (mirrors FIND_LABEL_FN in naukri.directApply.js) ─────
      const qContainerSel = questionContainers.map((c) => `[class*="${c}"]`).join(',');
      function findLabel(el) {
        // 1. Explicit <label for="id">
        if (el.id) {
          try {
            const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lbl?.textContent?.trim()) return lbl.textContent.trim();
          } catch {}
        }
        // 2. Walk up the DOM for Naukri question containers or plain label/legend
        let node = el.parentElement;
        for (let i = 0; i < labelWalkDepth && node; i++, node = node.parentElement) {
          const qEl = node.querySelector(qContainerSel);
          if (qEl?.textContent?.trim()) return qEl.textContent.trim();
          const lbl = node.querySelector('label, legend');
          if (lbl && lbl !== el && lbl.textContent.trim().length < 200) {
            return lbl.textContent.trim();
          }
          // Stop at form-field boundaries
          if (/form[-_]?field|field[-_]?group|widget|question|form[-_]?row/i.test(node.className || '')) break;
        }
        // 3. Attribute fallbacks
        return el.getAttribute('aria-label') || el.placeholder || el.getAttribute('title') || '';
      }

      // ── Required-field detector ────────────────────────────────────────────
      function isRequired(el) {
        if (el.required || el.getAttribute('aria-required') === 'true') return true;
        let node = el.parentElement;
        for (let i = 0; i < 4 && node; i++, node = node.parentElement) {
          if (node.querySelector('[class*="required"], abbr[title*="required" i]')) return true;
        }
        return false;
      }

      const fields = [];

      // ── Text / textarea ────────────────────────────────────────────────────
      for (const el of root.querySelectorAll(textInputSel)) {
        if (!el.offsetParent) continue;        // skip hidden
        const label = findLabel(el);
        if (!label) continue;
        fields.push({
          label,
          fieldType: el.tagName === 'TEXTAREA' ? 'textarea' : 'text',
          options:  [],
          required: isRequired(el),
        });
      }

      // ── Select ────────────────────────────────────────────────────────────
      for (const el of root.querySelectorAll('select')) {
        if (!el.offsetParent) continue;
        const label = findLabel(el);
        if (!label) continue;
        const options = Array.from(el.options)
          .filter((o) => o.text.trim() && !/^select|^choose|^--/i.test(o.text.trim()))
          .map((o) => o.text.trim());
        fields.push({ label, fieldType: 'select', options, required: isRequired(el) });
      }

      // ── Radio groups ──────────────────────────────────────────────────────
      const radioGroupsSeen = new Set();
      for (const el of root.querySelectorAll('input[type="radio"]')) {
        if (!el.offsetParent) continue;
        const container =
          el.closest('fieldset') || el.closest('[role="group"]') || el.parentElement;
        if (radioGroupsSeen.has(container)) continue;
        radioGroupsSeen.add(container);
        const legend = container.querySelector('legend');
        const label  = legend?.textContent?.trim() || findLabel(el);
        if (!label) continue;
        const options = Array.from(container.querySelectorAll('input[type="radio"]')).map((r) => {
          const lbl = container.querySelector(`label[for="${r.id}"]`) || r.closest('label');
          return (lbl?.textContent?.trim() || r.value || '').trim();
        }).filter(Boolean);
        fields.push({ label, fieldType: 'radio', options, required: isRequired(el) });
      }

      // ── Checkbox groups ────────────────────────────────────────────────────
      const cbGroupsSeen = new Set();
      for (const el of root.querySelectorAll('input[type="checkbox"]')) {
        if (!el.offsetParent) continue;
        const container =
          el.closest('fieldset') || el.closest('[role="group"]') || el.parentElement;
        if (cbGroupsSeen.has(container)) continue;
        cbGroupsSeen.add(container);
        const legend = container.querySelector('legend');
        const label  = legend?.textContent?.trim() || findLabel(el);
        if (!label) continue;
        const options = Array.from(container.querySelectorAll('input[type="checkbox"]')).map((cb) => {
          const lbl = container.querySelector(`label[for="${cb.id}"]`) || cb.closest('label');
          return (lbl?.textContent?.trim() || cb.value || '').trim();
        }).filter(Boolean);
        fields.push({ label, fieldType: 'checkbox', options, required: isRequired(el) });
      }

      return fields;
    },
    CONFIG,
  );
}

// ─── fillField ────────────────────────────────────────────────────────────────

/**
 * Fill a single field in the modal.
 *
 * Locates the element by matching its label text at runtime (rather than a
 * stored selector) so fills stay valid even when Naukri re-renders the modal.
 *
 * For checkboxes, `answer` may be a comma-separated list:
 *   "Full-time, Contract"
 *
 * @param {import('playwright').Page} page
 * @param {{ label: string, fieldType: string }} field
 * @param {string} answer
 * @returns {Promise<boolean>} true if the element was found and filled
 */
export async function fillField(page, field, answer) {
  return page.evaluate(
    ({ label, fieldType, answer: ans, modalRoots, questionContainers, labelWalkDepth, textInputSel }) => {
      // ── Find modal root (same as scrapeQuestions) ──────────────────────────
      let root = document.body;
      for (const sel of modalRoots) {
        const el = document.querySelector(sel);
        if (el) { root = el; break; }
      }

      // ── React-compatible value setter ──────────────────────────────────────
      // Standard el.value = x does NOT trigger React's synthetic onChange.
      // We must use the native prototype setter, then fire the events manually.
      function setNative(el, val) {
        const proto  = el.tagName === 'TEXTAREA'
          ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, val); else el.value = val;
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // ── Label finder (duplicated from scrapeQuestions for self-containment) ─
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
      const ansStr    = String(ans);
      const ansLower  = ansStr.toLowerCase().trim();

      // ── text / textarea ────────────────────────────────────────────────────
      if (fieldType === 'text' || fieldType === 'textarea') {
        for (const el of root.querySelectorAll(textInputSel)) {
          if (!el.offsetParent) continue;
          const elLabel = findLabel(el).toLowerCase().trim();
          if (elLabel === labelNorm || elLabel.includes(labelNorm) || labelNorm.includes(elLabel)) {
            setNative(el, ansStr);
            return true;
          }
        }
        return false;
      }

      // ── select ─────────────────────────────────────────────────────────────
      if (fieldType === 'select') {
        for (const el of root.querySelectorAll('select')) {
          if (!el.offsetParent) continue;
          const elLabel = findLabel(el).toLowerCase().trim();
          if (elLabel !== labelNorm && !elLabel.includes(labelNorm) && !labelNorm.includes(elLabel)) continue;
          // Find best option text match
          for (const opt of el.options) {
            const optText = opt.text.trim().toLowerCase();
            if (optText === ansLower || optText.includes(ansLower) || ansLower.includes(optText)) {
              el.value = opt.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false; // found the field but no matching option
        }
        return false;
      }

      // ── radio ──────────────────────────────────────────────────────────────
      if (fieldType === 'radio') {
        const seen = new Set();
        for (const el of root.querySelectorAll('input[type="radio"]')) {
          if (!el.offsetParent) continue;
          const container =
            el.closest('fieldset') || el.closest('[role="group"]') || el.parentElement;
          if (seen.has(container)) continue;
          seen.add(container);
          const legend     = container.querySelector('legend');
          const groupLabel = (legend?.textContent?.trim() || findLabel(el)).toLowerCase().trim();
          if (groupLabel !== labelNorm && !groupLabel.includes(labelNorm) && !labelNorm.includes(groupLabel)) continue;
          for (const radio of container.querySelectorAll('input[type="radio"]')) {
            const lbl = container.querySelector(`label[for="${radio.id}"]`) || radio.closest('label');
            const txt = (lbl?.textContent?.trim() || radio.value || '').toLowerCase();
            if (txt === ansLower || txt.includes(ansLower)) {
              radio.checked = true;
              radio.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        }
        return false;
      }

      // ── checkbox ───────────────────────────────────────────────────────────
      if (fieldType === 'checkbox') {
        // Answer may specify multiple selections: "Full-time, Contract"
        const targets = ansStr.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        const seen = new Set();
        for (const el of root.querySelectorAll('input[type="checkbox"]')) {
          if (!el.offsetParent) continue;
          const container =
            el.closest('fieldset') || el.closest('[role="group"]') || el.parentElement;
          if (seen.has(container)) continue;
          seen.add(container);
          const legend     = container.querySelector('legend');
          const groupLabel = (legend?.textContent?.trim() || findLabel(el)).toLowerCase().trim();
          if (groupLabel !== labelNorm && !groupLabel.includes(labelNorm) && !labelNorm.includes(groupLabel)) continue;
          let anyFilled = false;
          for (const cb of container.querySelectorAll('input[type="checkbox"]')) {
            const lbl = container.querySelector(`label[for="${cb.id}"]`) || cb.closest('label');
            const txt = (lbl?.textContent?.trim() || cb.value || '').toLowerCase();
            if (targets.some((t) => txt === t || txt.includes(t))) {
              cb.checked = true;
              cb.dispatchEvent(new Event('change', { bubbles: true }));
              anyFilled = true;
            }
          }
          return anyFilled;
        }
        return false;
      }

      return false;
    },
    {
      label:              field.label,
      fieldType:          field.fieldType,
      answer,
      modalRoots:         CONFIG.modalRoots,
      questionContainers: CONFIG.questionContainers,
      labelWalkDepth:     CONFIG.labelWalkDepth,
      textInputSel:       CONFIG.textInputSel,
    },
  );
}
