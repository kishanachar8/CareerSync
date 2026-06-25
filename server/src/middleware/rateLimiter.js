import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

const isDev = process.env.NODE_ENV !== 'production';

// In production we run multiple EC2 instances behind a load balancer — an
// in-memory store would let each instance enforce the limit independently,
// effectively multiplying it by instance count. Share counters via Redis instead.
const redisStore = (prefix) =>
  isDev
    ? undefined
    : new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix,
      });

/**
 * Global rate limiter — disabled in development, 200 req/15 min in production.
 * Auth endpoints use a separate tighter limiter regardless of environment.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 300,   // 0 = unlimited in dev
  skip: () => isDev,       // skip middleware entirely in dev
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:global:'),
  message: { success: false, message: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 75 : 15,   // relaxed in dev, tight in prod
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:auth:'),
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

// Refresh-token is called far more often than login (once per access-token
// expiry), so it needs a more generous ceiling than authLimiter while still
// guarding against credential-stuffing/DoS on the unauthenticated endpoint.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 90,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:refresh:'),
  message: { success: false, message: 'Too many requests, please try again later.' },
});
