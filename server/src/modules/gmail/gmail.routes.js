import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getStatus, getAuthUrl, oauthCallback, syncEmails, disconnect } from './gmail.controller.js';

const router = Router();

router.get('/status',     authenticate, getStatus);
router.get('/auth-url',   authenticate, getAuthUrl);
router.get('/callback',                 oauthCallback);   // Public — Google redirects here
router.post('/sync',      authenticate, syncEmails);
router.delete('/disconnect', authenticate, disconnect);

export default router;
