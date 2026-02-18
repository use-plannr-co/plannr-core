import express from 'express';
import * as ctrl from './users.controllers.js';
import {
    validateCreateUser,
    validateUpdateUserProfile,
    validateClerkWebhook,
    validateUpdateAvatar,
    validateUpdateUserEmail,
    validateUpdateIntegrations,
} from './users.validators.js';

const router = express.Router();

/**
 * Users Routes
 * --------------------------------
 */

// POST /users - create new user (registration)
router.post('/', validateCreateUser, ctrl.createUser);

// GET /users/profile - get current user profile
router.get('/profile', ctrl.getUserProfile);

// PUT /users/profile - update user profile
router.put('/profile', validateUpdateUserProfile, ctrl.updateUserProfile);

// PUT /users/email - update user email
router.put('/email', validateUpdateUserEmail, ctrl.updateUserEmail);

// DELETE /users/profile - delete user account
router.delete('/profile', ctrl.deleteUser);

// POST /users/auth/login - user login (validate user exists, create if needed)
router.post('/auth/login', ctrl.loginUser);

// POST /users/auth/logout - user logout
router.post('/auth/logout', ctrl.logoutUser);

// POST /users/auth/refresh - refresh auth token
router.post('/auth/refresh', ctrl.refreshToken);

// POST /users/webhooks/clerk - Clerk webhook handler
router.post('/webhooks/clerk', validateClerkWebhook, ctrl.handleClerkWebhook);

// POST /users/sync - Manual sync user from Clerk (for testing)
router.post('/sync', ctrl.syncUserFromClerk);

// PUT /users/avatar - Update user avatar
router.put('/avatar', validateUpdateAvatar, ctrl.updateAvatar);

// POST /users/onboarding/complete - Mark onboarding as complete
router.post('/onboarding/complete', ctrl.markOnboardingComplete);

// GET /users/integrations - Get user integrations status
router.get('/integrations', ctrl.getUserIntegrations);

// PUT /users/integrations - Update user integrations
router.put('/integrations', validateUpdateIntegrations, ctrl.updateUserIntegrations);

// GET /users/webhooks/test - Test webhook endpoint (for debugging)
router.get('/webhooks/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Webhook endpoint is reachable',
        timestamp: new Date().toISOString(),
    });
});

export default router;
