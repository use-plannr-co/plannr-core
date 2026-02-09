import express from 'express';
import * as ctrl from './subscriptions.controllers.js';
import { validateSyncSubscription, validateRevenueCatWebhook } from './subscriptions.validators.js';

const router = express.Router();

/**
 * Subscriptions Routes
 * --------------------------------
 */

// GET /subscriptions/status - Get current user's subscription status
// Requires authentication via x-clerk-user-id header
router.get('/status', ctrl.getSubscriptionStatus);

// POST /subscriptions/sync - App-driven subscription sync (Option B)
// Requires authentication via x-clerk-user-id header
// Called by the app after purchase, restore, or periodic refresh
router.post('/sync', validateSyncSubscription, ctrl.syncSubscription);

// POST /subscriptions/webhook - RevenueCat webhook handler (Option A - preferred)
// No authentication required, but signature verification is mandatory
// This endpoint is called by RevenueCat servers
router.post('/webhook', validateRevenueCatWebhook, ctrl.handleRevenueCatWebhook);

export default router;
