/**
 * PostgreSQL data-access layer for screening-question answers.
 *
 * ── DB ADAPTER INTERFACE ─────────────────────────────────────────────────────
 * Every function accepts a `db` argument:
 *   { query(sql: string, params: any[]): Promise<{ rows: any[] }> }
 *
 * Compatible with — swap freely:
 *   • pg.Pool / pg.Client       (zero changes)
 *   • knex:  { query: (s, p) => knex.raw(s.replace(/\$(\d+)/g,'?'), p) }
 *   • Drizzle (postgres.js):    { query: (s, p) => drizzle.execute(s, p) }
 *   • MongoDB (if you skip PG): see the adapter example at the bottom of file
 *
 * ── SETUP ────────────────────────────────────────────────────────────────────
 * Add to your server dependencies:
 *   npm install pg
 *
 * Call createTable(db) once on startup (idempotent):
 *   import pg from 'pg';
 *   const pool = new pg.Pool({ connectionString: process.env.PG_URI });
 *   await createTable(pool);
 *
 * ── ENCRYPTION ───────────────────────────────────────────────────────────────
 * Answers are encrypted before INSERT and decrypted after SELECT.
 * The database never stores plaintext.
 */
import { createHash } from 'node:crypto';
import { encrypt, decrypt } from './encrypt.js';

// ─── DDL ──────────────────────────────────────────────────────────────────────

const CREATE_TABLE_SQL = /* sql */`
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS user_answers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT        NOT NULL,

    -- SHA-256 of normalize(question_text) — fast exact-match lookup
    question_hash   CHAR(64)    NOT NULL,
    question_text   TEXT        NOT NULL,

    -- AES-256-GCM encrypted JSON { iv, tag, ciphertext }
    answer          TEXT        NOT NULL,

    field_type      TEXT        NOT NULL DEFAULT 'text'
                    CHECK (field_type IN ('text','textarea','select','radio','checkbox')),

    -- Option labels for select/radio/checkbox so the UI can display choices
    options         JSONB       NOT NULL DEFAULT '[]',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT user_answers_unique UNIQUE (user_id, question_hash)
  );

  CREATE INDEX IF NOT EXISTS idx_ua_user ON user_answers (user_id);
`;

/** Run once on app startup — safe to call repeatedly (all statements are IF NOT EXISTS). */
export async function createTable(db) {
  await db.query(CREATE_TABLE_SQL, []);
}

// ─── Hash helper ──────────────────────────────────────────────────────────────

/** SHA-256 hex of the already-normalized question text. */
export function hashQuestion(normalizedText) {
  return createHash('sha256').update(normalizedText).digest('hex');
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function decryptRow(row) {
  return { ...row, answer: decrypt(row.answer) };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Exact-hash lookup. Returns null when no match.
 * Called first in the matching pipeline (O(1) index hit).
 */
export async function findByHash(db, userId, hash) {
  const { rows } = await db.query(
    `SELECT * FROM user_answers
       WHERE user_id = $1 AND question_hash = $2
       LIMIT 1`,
    [String(userId), hash],
  );
  return rows.length ? decryptRow(rows[0]) : null;
}

/**
 * Load every answer for a user — used by the fuzzy-matching fallback.
 * Result is intentionally sorted newest-first so fuzzy ties break towards
 * the most recently updated answer.
 */
export async function findAll(db, userId) {
  const { rows } = await db.query(
    `SELECT * FROM user_answers
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
    [String(userId)],
  );
  return rows.map(decryptRow);
}

/**
 * Insert or update an answer for a (user, question) pair.
 *
 * Re-encrypts on every upsert so the IV is always fresh — prevents an
 * attacker who sees two identical encrypted values from inferring plaintext.
 */
export async function upsertAnswer(db, userId, {
  questionText,
  normalizedText,
  answer,
  fieldType = 'text',
  options   = [],
}) {
  const hash      = hashQuestion(normalizedText);
  const encrypted = encrypt(String(answer));

  await db.query(
    /* sql */`
    INSERT INTO user_answers
      (user_id, question_hash, question_text, answer, field_type, options)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    ON CONFLICT (user_id, question_hash) DO UPDATE SET
      question_text = EXCLUDED.question_text,
      answer        = EXCLUDED.answer,
      field_type    = EXCLUDED.field_type,
      options       = EXCLUDED.options,
      updated_at    = now()`,
    [String(userId), hash, questionText, encrypted, fieldType, JSON.stringify(options)],
  );
  return hash;
}

export async function deleteAnswer(db, userId, hash) {
  await db.query(
    `DELETE FROM user_answers WHERE user_id = $1 AND question_hash = $2`,
    [String(userId), hash],
  );
}

// ─── MongoDB compatibility adapter ───────────────────────────────────────────
// If you want to skip adding PostgreSQL and keep using MongoDB, wire up the
// db functions to a Mongoose model instead.
//
// Example (drop this in a separate file):
//
//   import mongoose from 'mongoose';
//   import { encrypt, decrypt } from './encrypt.js';
//   import { hashQuestion } from './db.js';
//
//   const schema = new mongoose.Schema({
//     userId:       { type: String, required: true },
//     questionHash: { type: String, required: true },
//     questionText: String,
//     answer:       String,         // encrypted
//     fieldType:    { type: String, enum: ['text','textarea','select','radio','checkbox'], default: 'text' },
//     options:      [String],
//   }, { timestamps: true });
//   schema.index({ userId: 1, questionHash: 1 }, { unique: true });
//   const AnswerDoc = mongoose.model('UserAnswer', schema);
//
//   export const mongoDb = {
//     async query(sql, params) {
//       // Not used — override the qa/ functions directly below
//       throw new Error('Use the mongoDb helper functions, not raw SQL');
//     },
//   };
//
//   export async function findAll_mongo(userId) {
//     const docs = await AnswerDoc.find({ userId: String(userId) }).lean();
//     return docs.map(d => ({
//       user_id: d.userId, question_hash: d.questionHash,
//       question_text: d.questionText, answer: decrypt(d.answer),
//       field_type: d.fieldType, options: d.options || [],
//     }));
//   }
//
//   export async function upsertAnswer_mongo(userId, data) {
//     const hash = hashQuestion(data.normalizedText);
//     await AnswerDoc.findOneAndUpdate(
//       { userId: String(userId), questionHash: hash },
//       { $set: { questionText: data.questionText, answer: encrypt(data.answer),
//                 fieldType: data.fieldType, options: data.options ?? [] } },
//       { upsert: true },
//     );
//     return hash;
//   }
