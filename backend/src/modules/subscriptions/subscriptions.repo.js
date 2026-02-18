import { db } from '../../config/db.js';
import { subscriptions, users } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Subscriptions Repository
 * Database operations for subscription management
 */

/**
 * Get subscription by user ID
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>}
 */
export const getSubscriptionByUserId = async (userId) => {
    const result = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

    return result[0] || null;
};

/**
 * Get subscription by RevenueCat App User ID
 * @param {string} rcAppUserId - RevenueCat App User ID
 * @returns {Promise<Object|null>}
 */
export const getSubscriptionByRcAppUserId = async (rcAppUserId) => {
    const result = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.rcAppUserId, rcAppUserId))
        .limit(1);

    return result[0] || null;
};

/**
 * Upsert subscription data
 * Creates or updates subscription record and optionally updates users.is_pro
 *
 * @param {Object} data - Subscription data
 * @param {string} data.userId - User UUID
 * @param {string} data.rcAppUserId - RevenueCat App User ID
 * @param {boolean} data.isPro - Whether user has Pro access
 * @param {boolean} data.entitlementActive - Whether entitlement is active
 * @param {Date|null} data.expirationAt - Expiration date
 * @param {string|null} data.productId - Product identifier
 * @param {string|null} data.store - Store identifier
 * @param {Object|null} data.metadata - Additional metadata
 * @returns {Promise<Object>}
 */
export const upsertSubscription = async (data) => {
    const {
        userId,
        rcAppUserId,
        isPro,
        entitlementActive,
        expirationAt,
        productId,
        store,
        metadata,
    } = data;

    // Check if subscription exists
    const existing = await getSubscriptionByUserId(userId);

    const subscriptionData = {
        userId,
        rcAppUserId,
        isPro: isPro || false,
        entitlementActive: entitlementActive || false,
        expirationAt: expirationAt || null,
        productId: productId || null,
        store: store || null,
        metadata: metadata || null,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
    };

    let result;

    if (existing) {
        // Update existing subscription
        result = await db
            .update(subscriptions)
            .set(subscriptionData)
            .where(eq(subscriptions.userId, userId))
            .returning();
    } else {
        // Insert new subscription
        result = await db
            .insert(subscriptions)
            .values({
                ...subscriptionData,
                createdAt: new Date(),
            })
            .returning();
    }

    // Update users.is_pro for convenience (optional but recommended for performance)
    await db
        .update(users)
        .set({
            isPro: isPro || false,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

    return result[0];
};

/**
 * Create initial subscription record for a new user
 * @param {string} userId - User UUID
 * @param {string} rcAppUserId - RevenueCat App User ID (usually Clerk user ID)
 * @returns {Promise<Object>}
 */
export const createInitialSubscription = async (userId, rcAppUserId) => {
    const result = await db
        .insert(subscriptions)
        .values({
            userId,
            rcAppUserId,
            isPro: false,
            entitlementActive: false,
            lastSyncedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning();

    return result[0];
};

/**
 * Delete subscription by user ID
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 */
export const deleteSubscriptionByUserId = async (userId) => {
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));

    // Also reset users.is_pro
    await db
        .update(users)
        .set({
            isPro: false,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
};
