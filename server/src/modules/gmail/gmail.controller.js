import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import env from '../../config/env.js';
import {
  getGmailAuthUrl,
  handleGmailCallback,
  syncGmailEmails,
  getGmailStatus,
  disconnectGmail,
} from './gmail.service.js';

// GET /gmail/status
export const getStatus = asyncHandler(async (req, res) => {
  const status = await getGmailStatus(req.user.id);
  res.json(new ApiResponse(200, status, 'Gmail status'));
});

// GET /gmail/auth-url
export const getAuthUrl = asyncHandler(async (req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError(501, 'Gmail integration is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
  const url = await getGmailAuthUrl(req.user.id);
  res.json(new ApiResponse(200, { url }, 'Auth URL generated'));
});

// GET /gmail/callback  (called by Google, not the frontend)
export const oauthCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${env.CLIENT_URL}/applications?gmail=denied`);
  }
  if (!code || !state) {
    return res.redirect(`${env.CLIENT_URL}/applications?gmail=error`);
  }

  try {
    await handleGmailCallback(code, state);
    res.redirect(`${env.CLIENT_URL}/applications?gmail=connected`);
  } catch (err) {
    res.redirect(`${env.CLIENT_URL}/applications?gmail=error&msg=${encodeURIComponent(err.message)}`);
  }
});

// POST /gmail/sync
export const syncEmails = asyncHandler(async (req, res) => {
  const result = await syncGmailEmails(req.user.id);
  res.json(new ApiResponse(200, result, `Sync complete — ${result.updated} status update(s)`));
});

// DELETE /gmail/disconnect
export const disconnect = asyncHandler(async (req, res) => {
  await disconnectGmail(req.user.id);
  res.json(new ApiResponse(200, {}, 'Gmail disconnected'));
});
