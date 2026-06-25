import crypto from 'crypto';
import asyncHandler from '../../utils/asyncHandler.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { COOKIE_OPTIONS } from '../../constants/index.js';
import { verifyRefreshToken } from '../../utils/token.js';
import env from '../../config/env.js';
import {
  registerService,
  loginService,
  refreshTokenService,
  logoutService,
  verifyEmailService,
  resendVerificationService,
  getGoogleAuthUrlService,
  googleCallbackService,
} from './auth.service.js';

const OAUTH_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
  maxAge: 5 * 60 * 1000,
};

// POST /api/v1/auth/register
export const register = asyncHandler(async (req, res) => {
  const result = await registerService(req.body);
  res.status(201).json(new ApiResponse(201, null, result.message));
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await loginService(req.body);
  res
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    .status(200)
    .json(new ApiResponse(200, { accessToken, user }, 'Login successful'));
});

// POST /api/v1/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { accessToken, refreshToken: newRefreshToken, user } = await refreshTokenService(token);
  res
    .cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)
    .status(200)
    .json(new ApiResponse(200, { accessToken, user }, 'Token refreshed'));
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await logoutService(decoded.sub);
    } catch {
      // Token invalid or expired — still clear the cookie
    }
  }

  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res
    .clearCookie('refreshToken', clearOptions)
    .status(200)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

// GET /api/v1/auth/verify-email?token=
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Verification token is required');

  const result = await verifyEmailService(token);
  res.status(200).json(new ApiResponse(200, null, result.message));
});

// POST /api/v1/auth/resend-verification
export const resendVerification = asyncHandler(async (req, res) => {
  const result = await resendVerificationService(req.body.email);
  res.status(200).json(new ApiResponse(200, null, result.message));
});

const resolveGoogleCallbackUrl = (req) =>
  env.GOOGLE_AUTH_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;

// GET /api/v1/auth/google — kicks off "Sign in with Google" (full browser redirect)
export const googleAuthRedirect = asyncHandler(async (req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError(501, 'Google sign-in is not configured on this server.');
  }
  const state = crypto.randomBytes(16).toString('hex');
  const callbackUrl = resolveGoogleCallbackUrl(req);
  res.cookie('oauth_state', state, OAUTH_STATE_COOKIE_OPTIONS);
  res.redirect(getGoogleAuthUrlService(state, callbackUrl));
});

// GET /api/v1/auth/google/callback (called by Google, not the frontend)
export const googleAuthCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = req.cookies?.oauth_state;
  res.clearCookie('oauth_state', OAUTH_STATE_COOKIE_OPTIONS);

  if (error || !code || !state || state !== expectedState) {
    return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
  }

  try {
    const callbackUrl = resolveGoogleCallbackUrl(req);
    const { refreshToken } = await googleCallbackService(code, callbackUrl);
    res
      .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
      .redirect(`${env.CLIENT_URL}/dashboard`);
  } catch {
    res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
  }
});
