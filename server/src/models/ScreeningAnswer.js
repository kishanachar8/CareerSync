import mongoose from 'mongoose';

/**
 * Stores one user's answer to one screening question, per portal.
 *
 * answer is AES-256-GCM encrypted at rest (via qaService) so raw values are
 * never persisted in plaintext — important because answers can contain
 * compensation figures, notice periods, and personal preferences.
 *
 * normalizedQuestion is the output of normalize(questionText): lowercase,
 * punctuation-stripped, whitespace-collapsed.  It drives exact-match lookup
 * and is also the input to Levenshtein fuzzy matching.
 *
 * usageCount is incremented each time an answer is auto-filled so the UI can
 * show which questions are fully learned vs. still being answered manually.
 */
const screeningAnswerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
    },

    questionText: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: 500,
    },

    // normalize(questionText) — used for exact + fuzzy matching
    normalizedQuestion: {
      type:     String,
      required: true,
    },

    // AES-256-GCM encrypted JSON of the original answer value.
    // JSON-wrapping lets Mixed types (string | number | boolean | string[])
    // survive the encrypt/decrypt round-trip without type loss.
    answer: {
      type:     String,       // always stored as encrypted ciphertext string
      required: true,
    },

    questionType: {
      type:    String,
      enum:    ['text', 'textarea', 'number', 'radio', 'checkbox', 'dropdown'],
      default: 'text',
    },

    // Choice labels for radio / checkbox / dropdown — used to validate that a
    // stored answer is still a valid option before auto-filling.
    options: {
      type:    [String],
      default: [],
    },

    source: {
      type:    String,
      enum:    ['naukri', 'indeed', 'linkedin', 'foundit'],
      default: 'naukri',
    },

    // How many times this answer has been successfully auto-filled.
    usageCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // Confidence score (0–1) at the time this answer was first saved.
    // 1.0 = manually entered; < 1.0 = carried over from a fuzzy match.
    confidence: {
      type:    Number,
      default: 1,
      min:     0,
      max:     1,
    },
  },
  { timestamps: true },
);

// Primary lookup: one answer per (user, normalized question, portal)
screeningAnswerSchema.index(
  { userId: 1, normalizedQuestion: 1, source: 1 },
  { unique: true },
);

// Secondary: load all for a user+portal (batch fuzzy-matching)
screeningAnswerSchema.index({ userId: 1, source: 1 });

export default mongoose.model('ScreeningAnswer', screeningAnswerSchema);
