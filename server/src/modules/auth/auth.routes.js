import { Router } from 'express';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimiter.js';
import validate from '../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
} from './auth.validation.js';
import {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  googleAuthRedirect,
  googleAuthCallback,
} from './auth.controller.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login',    authLimiter, validate(loginSchema),    login);
router.post('/refresh-token', refreshLimiter, refreshToken);
router.post('/logout',        logout);
router.get('/verify-email',   verifyEmail);
router.post(
  '/resend-verification',
  authLimiter,
  validate(resendVerificationSchema),
  resendVerification,
);

router.get('/google',          authLimiter, googleAuthRedirect);
router.get('/google/callback',              googleAuthCallback); // Public — Google redirects here

export default router;
