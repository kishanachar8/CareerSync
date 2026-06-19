/**
 * AES-256-GCM encryption for screening-question answers stored in PostgreSQL.
 *
 * Uses ANSWER_ENCRYPTION_KEY (separate from CREDENTIALS_ENCRYPTION_KEY so you
 * can rotate them independently).  Identical algorithm to crypto.util.js —
 * extracted here so this qa/ module remains self-contained.
 *
 * Wire up in .env:
 *   ANSWER_ENCRYPTION_KEY=<at-least-32-random-characters>
 *
 * On-disk format: JSON string { iv, tag, ciphertext } — all hex.
 */
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  // Fall back to CREDENTIALS_ENCRYPTION_KEY so the feature works without a
  // separate key — set ANSWER_ENCRYPTION_KEY to rotate independently.
  const raw = process.env.ANSWER_ENCRYPTION_KEY || process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error('Set ANSWER_ENCRYPTION_KEY (or CREDENTIALS_ENCRYPTION_KEY) to at least 32 characters in .env');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string.
 * @returns {string} JSON-stringified { iv, tag, ciphertext } (all hex)
 */
export function encrypt(plaintext) {
  const key    = getKey();
  const iv     = crypto.randomBytes(12);          // 96-bit IV — GCM standard
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc    = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return JSON.stringify({
    iv:         iv.toString('hex'),
    tag:        cipher.getAuthTag().toString('hex'),
    ciphertext: enc.toString('hex'),
  });
}

/**
 * Decrypt a value produced by encrypt().
 * Throws if the payload has been tampered with (GCM auth tag mismatch).
 * @param {string} payload JSON string from encrypt()
 * @returns {string} plaintext
 */
export function decrypt(payload) {
  const key             = getKey();
  const { iv, tag, ciphertext } = JSON.parse(payload);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return decipher.update(Buffer.from(ciphertext, 'hex')) + decipher.final('utf8');
}
