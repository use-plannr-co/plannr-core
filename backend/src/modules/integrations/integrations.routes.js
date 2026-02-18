import express from 'express';
import * as ctrl from './integrations.controllers.js';
import { validateGoogleCalendarExport } from './integrations.validators.js';

const router = express.Router();

/**
 * Integration Routes
 * --------------------------------
 */

// POST /integrations/google-calendar/export - Export events to Google Calendar
router.post('/google-calendar/export', validateGoogleCalendarExport, ctrl.exportToGoogleCalendar);

// GET /integrations/google-calendar/status - Get Google Calendar connection status
router.get('/google-calendar/status', ctrl.getGoogleCalendarStatus);

export default router;
