import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Local uploads dir (dev fallback when Cloudinary isn't configured) ────────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Cloudinary is only "ready" when credentials look like real values
// (non-empty and not the placeholder strings from .env.example).
const PLACEHOLDER = new Set(['your_cloud_name', 'your_api_key', 'your_api_secret', '']);
const cloudinaryReady = !!(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET &&
  !PLACEHOLDER.has(env.CLOUDINARY_CLOUD_NAME) &&
  !PLACEHOLDER.has(env.CLOUDINARY_API_KEY)
);

if (!cloudinaryReady) {
  logger.info('[Upload] Cloudinary not configured — avatar/resume uploads will use local storage');
}

// ─── Detect image extension from buffer magic bytes ───────────────────────────
function extFromBuffer(buf) {
  if (!buf || buf.length < 4) return 'bin';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf.length >= 12 && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return 'bin';
}

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.memoryStorage();

const imageFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new ApiError(400, 'Only image files are allowed'), false);
};

const documentFilter = (_req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new ApiError(400, 'Only PDF files are allowed'), false);
};

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

export const uploadDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('resume');

// ─── Cloudinary upload ────────────────────────────────────────────────────────
export const streamToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
      else resolve(result);
    });
    stream.end(buffer);
  });

// Map browser MIME type → file extension for reliable extension detection
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/gif':  'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

// ─── Local fallback writer ────────────────────────────────────────────────────
function saveLocally(buffer, options) {
  // Prefer MIME type from the browser (most reliable), fall back to magic bytes
  const ext = (options.mimetype && MIME_TO_EXT[options.mimetype])
    || extFromBuffer(buffer)
    || 'bin';

  const baseId   = (options.public_id || String(Date.now())).replace(/[\\/]/g, '_');
  const filename = `${baseId}.${ext}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, buffer);

  const baseUrl = `http://localhost:${env.PORT || 5000}`;
  return {
    secure_url: `${baseUrl}/uploads/${filename}`,
    public_id:  filename,
  };
}

/**
 * Upload a file buffer.
 * - Uses Cloudinary when real credentials are configured.
 * - Falls back to local disk (dev mode) when Cloudinary is not configured
 *   OR when the Cloudinary upload fails (e.g. placeholder credentials).
 *
 * Returns { secure_url, public_id } — same shape as a Cloudinary response.
 */
export const uploadFile = async (buffer, options = {}) => {
  if (cloudinaryReady) {
    try {
      return await streamToCloudinary(buffer, options);
    } catch (err) {
      logger.warn(`[Upload] Cloudinary failed (${err.message}) — falling back to local storage`);
    }
  }
  return saveLocally(buffer, options);
};

/**
 * Delete a file — no-op when Cloudinary isn't configured.
 * Fails silently so deletion never breaks user-facing flows.
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!cloudinaryReady) {
    try {
      const filepath = path.join(uploadsDir, publicId);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch { /* ignore */ }
    return;
  }
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch { /* ignore */ }
};
