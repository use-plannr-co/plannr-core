import express from 'express';
import * as ctrl from './preferences.controllers.js';
import { validateUpdatePreferences } from './preferences.validators.js';

const router = express.Router();

/**
 * Preferences Routes
 * --------------------------------
 */

// GET /preferences - get user preferences
router.get('/', ctrl.getPreferences);

// PUT /preferences - update user preferences
router.put('/', validateUpdatePreferences, ctrl.updatePreferences);

// POST /preferences/reset - reset preferences to default
router.post('/reset', ctrl.resetPreferences);

export default router;
