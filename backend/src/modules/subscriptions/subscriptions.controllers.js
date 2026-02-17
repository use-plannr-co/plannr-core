import crypto from 'crypto';
import * as repo from './subscriptions.repo.js';
import * as usersRepo from '../users/users.repo.js';
import { ENV } from '../../config/env.js';

/**
 * Subscriptions Controllers
 * Handles subscription-related HTTP requests
 */

/**
 * Verify RevenueCat webhook authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {boolean}
 */
const verifyWebhookAuth = (authHeader) => {
    if (!ENV.REVENUECAT_WEBHOOK_SECRET) {
        console.warn('⚠️ REVENUECAT_WEBHOOK_SECRET not configured');
        return false;
    }

    const expected = `Bearer ${ENV.REVENUECAT_WEBHOOK_SECRET}`;

    if (authHeader.length !== expected.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
};

/**
 * App-driven sync endpoint (Option B)
 * POST /api/subscriptions/sync
 *
 * Called by the app after purchase, restore, or periodic refresh
 * Requires authentication via Clerk
 */
export const syncSubscription = async (req, res, next) => {
    try {
        const clerkUserId = req.headers['x-clerk-user-id'];

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // Get user from database
        const user = await usersRepo.getUserByClerkId(clerkUserId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const {
            rc_app_user_id,
            is_pro,
            entitlement_active,
            expiration_at,
            product_id,
            store,
            metadata,
        } = req.validatedData;

        // Verify that the rc_app_user_id matches the authenticated user
        if (rc_app_user_id !== clerkUserId) {
            return res.status(403).json({
                success: false,
                message: 'App User ID mismatch',
            });
        }

        // Upsert subscription data
        const subscription = await repo.upsertSubscription({
            userId: user.id,
            rcAppUserId: rc_app_user_id,
            isPro: is_pro,
            entitlementActive: entitlement_active,
            expirationAt: expiration_at ? new Date(expiration_at) : null,
            productId: product_id,
            store: store || 'app_store',
            metadata: metadata || null,
        });

        console.log(`✅ Subscription synced for user ${clerkUserId}: isPro=${is_pro}`);

        res.status(200).json({
            success: true,
            message: 'Subscription synced successfully',
            data: {
                isPro: subscription.isPro,
                entitlementActive: subscription.entitlementActive,
                expirationAt: subscription.expirationAt,
                productId: subscription.productId,
                lastSyncedAt: subscription.lastSyncedAt,
            },
        });
    } catch (error) {
        console.error('❌ Sync subscription error:', error);
        next(error);
    }
};

/**
 * Get current user's subscription status
 * GET /api/subscriptions/status
 *
 * Returns the current subscription status for the authenticated user
 */
export const getSubscriptionStatus = async (req, res, next) => {
    try {
        const clerkUserId = req.headers['x-clerk-user-id'];

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // Get user from database
        const user = await usersRepo.getUserByClerkId(clerkUserId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Get subscription
        const subscription = await repo.getSubscriptionByUserId(user.id);

        if (!subscription) {
            return res.status(200).json({
                success: true,
                data: {
                    isPro: false,
                    entitlementActive: false,
                    expirationAt: null,
                    productId: null,
                    store: null,
                    lastSyncedAt: null,
                },
            });
        }

        res.status(200).json({
            success: true,
            data: {
                isPro: subscription.isPro,
                entitlementActive: subscription.entitlementActive,
                expirationAt: subscription.expirationAt,
                productId: subscription.productId,
                store: subscription.store,
                lastSyncedAt: subscription.lastSyncedAt,
            },
        });
    } catch (error) {
        console.error('❌ Get subscription status error:', error);
        next(error);
    }
};

/**
 * RevenueCat webhook endpoint (Option A - preferred)
 * POST /api/subscriptions/webhook
 *
 * Receives webhook events from RevenueCat
 * No authentication required, but signature verification is mandatory
 */
export const handleRevenueCatWebhook = async (req, res, next) => {
    try {
        // Verify webhook authorization
        const authHeader = req.headers['authorization'];

        if (!authHeader || !verifyWebhookAuth(authHeader)) {
            console.error('❌ Invalid webhook authorization');
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { event } = req.validatedData;
        const {
            type,
            app_user_id,
            product_id,
            expiration_at_ms,
            environment,
            entitlement_ids,
            entitlement_id,
            store,
        } = event;

        console.log(`📱 RevenueCat webhook received: ${type} for user ${app_user_id}`);

        // Get user by Clerk ID (app_user_id should be the Clerk user ID)
        const user = await usersRepo.getUserByClerkId(app_user_id);

        if (!user) {
            console.warn(`⚠️ User not found for app_user_id: ${app_user_id}`);
            // Return 200 to acknowledge receipt (avoid retries)
            return res.status(200).json({
                success: true,
                message: 'User not found, webhook acknowledged',
            });
        }

        // Determine if user has Pro access based on entitlements
        const allEntitlements = entitlement_ids || (entitlement_id ? [entitlement_id] : []);
        const hasProEntitlement = allEntitlements.includes('plannr_pro');

        // Determine subscription state based on event type
        let isPro = false;
        let entitlementActive = false;

        switch (type) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
            case 'UNCANCELLATION':
            case 'NON_RENEWING_PURCHASE':
                isPro = hasProEntitlement;
                entitlementActive = hasProEntitlement;
                break;

            case 'CANCELLATION':
                // Entitlement remains active until expiration
                isPro = hasProEntitlement;
                entitlementActive = hasProEntitlement;
                break;

            case 'EXPIRATION':
                isPro = false;
                entitlementActive = false;
                break;

            case 'BILLING_ISSUE':
                // Keep current status, but note the issue
                const existingSub = await repo.getSubscriptionByUserId(user.id);
                isPro = existingSub?.isPro || false;
                entitlementActive = existingSub?.entitlementActive || false;
                break;

            case 'PRODUCT_CHANGE':
                isPro = hasProEntitlement;
                entitlementActive = hasProEntitlement;
                break;

            case 'TRANSFER':
            case 'SUBSCRIPTION_PAUSED':
            case 'SUBSCRIPTION_EXTENDED':
                // Preserve current status for these events
                const currentSub = await repo.getSubscriptionByUserId(user.id);
                isPro = currentSub?.isPro || false;
                entitlementActive = currentSub?.entitlementActive || false;
                break;

            default:
                console.warn(`⚠️ Unknown event type: ${type}`);
                isPro = hasProEntitlement;
                entitlementActive = hasProEntitlement;
        }

        // Upsert subscription data
        await repo.upsertSubscription({
            userId: user.id,
            rcAppUserId: app_user_id,
            isPro,
            entitlementActive,
            expirationAt: expiration_at_ms ? new Date(expiration_at_ms) : null,
            productId: product_id || null,
            store: store || 'app_store',
            metadata: {
                lastWebhookEvent: type,
                lastWebhookTime: new Date().toISOString(),
                environment: environment || 'PRODUCTION',
            },
        });

        console.log(`✅ Webhook processed: user ${app_user_id} isPro=${isPro}`);

        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
        });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        // Return 200 to avoid retries (we've logged the error)
        res.status(200).json({
            success: false,
            message: 'Webhook acknowledged with error',
        });
    }
};
