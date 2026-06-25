import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(5000),

  MONGO_URI: Joi.string().required(),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),

  GEMINI_API_KEY: Joi.string().allow('').default(''),

  // Job provider APIs (all optional — providers are silently skipped when not set)
  ADZUNA_APP_ID:    Joi.string().allow('').default(''),
  ADZUNA_API_KEY:   Joi.string().allow('').default(''),
  JOOBLE_API_KEY:   Joi.string().allow('').default(''),
  FINDWORK_API_KEY: Joi.string().allow('').default(''),
  REED_API_KEY:     Joi.string().allow('').default(''),

  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().allow('').default('CareerSync <no-reply@careersync.io>'),

  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),
  // Public base URL of this API, used to build absolute links to locally-stored
  // files (dev-only fallback — Cloudinary is required in production).
  API_PUBLIC_URL: Joi.string().uri().default(''),

  // Automation: AES-256-GCM keys for encrypting credentials and screening answers at rest
  CREDENTIALS_ENCRYPTION_KEY: Joi.string().min(32).required(),
  ANSWER_ENCRYPTION_KEY:      Joi.string().min(32).allow('').default(''),

  // Google OAuth (Google Cloud Console → OAuth 2.0 credentials)
  // Shared client ID/secret — Gmail sync and "Sign in with Google" use separate redirect URIs.
  GOOGLE_CLIENT_ID:     Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GOOGLE_REDIRECT_URI:      Joi.string().allow('').default('http://localhost:5000/api/v1/gmail/callback'),
  GOOGLE_AUTH_REDIRECT_URI: Joi.string().allow('').default('http://localhost:5000/api/v1/auth/google/callback'),
}).unknown(true);

const { error, value: env } = schema.validate(process.env);

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

const PLACEHOLDER_KEYS = new Set([
  'change-me-in-production-min-32-chars!!',
  'change_this_credentials_key_min_32_chars',
  'change_this_answer_key_min_32_chars_here',
]);

if (env.NODE_ENV === 'production') {
  if (PLACEHOLDER_KEYS.has(env.CREDENTIALS_ENCRYPTION_KEY) || PLACEHOLDER_KEYS.has(env.ANSWER_ENCRYPTION_KEY)) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY/ANSWER_ENCRYPTION_KEY must not use the example placeholder value in production.');
  }
  if (env.CLOUDINARY_CLOUD_NAME === '' || env.CLOUDINARY_API_KEY === '' || env.CLOUDINARY_API_SECRET === '') {
    throw new Error('Cloudinary credentials are required in production (local-disk upload fallback is not safe for multi-instance deployment).');
  }
}

export default env;
