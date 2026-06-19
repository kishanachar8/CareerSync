import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { jobSearchSchema } from './job.validation.js';
import {
  searchJobs,
  getJob,
  getSavedJobs,
  getSavedJobIds,
  saveJob,
  unsaveJob,
} from './job.controller.js';

const router = Router();

// Specific paths must come before /:id — otherwise Express matches 'saved' as an id
router.get('/saved',         authenticate, getSavedJobs);
router.get('/saved/ids',     authenticate, getSavedJobIds);
router.post('/save',         authenticate, saveJob);
router.delete('/save/:jobId', authenticate, unsaveJob);

// Public search
router.get('/', validate(jobSearchSchema), searchJobs);

// Parameterised — must be last so it doesn't swallow the routes above
router.get('/:id', getJob);

export default router;
