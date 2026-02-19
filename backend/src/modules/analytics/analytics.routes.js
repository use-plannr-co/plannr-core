import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as validators from './analytics.validators.js';
import * as ctrl from './analytics.controllers.js';

const router = Router();

router.use(requireAuth);

router.get('/', ctrl.getAnalytics);
router.post('/mood', validate(validators.moodCheckinSchema), ctrl.submitMoodCheckin);

export default router;
