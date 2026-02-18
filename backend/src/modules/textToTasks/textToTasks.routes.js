import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { textToTasksRateLimit } from '../../middleware/rateLimiters.js';
import * as textToTasksValidators from './textToTasks.validators.js';
import * as textToTasksControllers from './textToTasks.controllers.js';

const router = Router();

// Apply authentication and rate limiting to all routes
// router.use(requireAuth);
router.use(textToTasksRateLimit);

/**
 * Text-to-Tasks API Routes
 */

// Parse text into task drafts
router.post(
    '/parse',
    validate(textToTasksValidators.parseInputSchema),
    textToTasksControllers.parseText
);

// Get drafts for a session
router.get(
    '/sessions/:sessionId/drafts',
    validate(textToTasksValidators.sessionIdParamSchema, 'params'),
    validate(textToTasksValidators.getDraftsQuerySchema, 'query'),
    textToTasksControllers.getDrafts
);

// Enrich drafts with defaults and overrides
router.put(
    '/sessions/:sessionId/enrich',
    validate(textToTasksValidators.enrichInputSchema),
    textToTasksControllers.enrichDrafts
);

// Generate schedule from enriched drafts
router.post(
    '/sessions/:sessionId/generate-schedule',
    validate(textToTasksValidators.generateInputSchema),
    textToTasksControllers.generateSchedule
);

// Delete session and associated drafts
router.delete(
    '/sessions/:sessionId',
    validate(textToTasksValidators.sessionIdParamSchema, 'params'),
    textToTasksControllers.deleteSession
);

export default router;
