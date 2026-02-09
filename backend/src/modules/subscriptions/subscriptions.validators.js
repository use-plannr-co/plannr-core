import { z } from 'zod';

/**
 * Subscriptions Validators
 * Zod validation schemas for subscription endpoints
 */

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.body);
            req.validatedData = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            next(error);
        }
    };
};

/**
 * Schema for app-driven sync endpoint
 * Validates the payload sent from the app after purchase/restore
 */
const syncSubscriptionSchema = z.object({
    rc_app_user_id: z.string().min(1, 'RevenueCat App User ID is required'),
    is_pro: z.boolean(),
    entitlement_active: z.boolean(),
    expiration_at: z.string().datetime().nullable().optional(),
    product_id: z.string().nullable().optional(),
    store: z.string().nullable().optional(),
    metadata: z.record(z.any()).nullable().optional(),
});

/**
 * Schema for RevenueCat webhook events
 * Validates the event payload from RevenueCat webhooks
 */
const revenueCatWebhookSchema = z.object({
    event: z.object({
        type: z.enum([
            'INITIAL_PURCHASE',
            'RENEWAL',
            'CANCELLATION',
            'EXPIRATION',
            'BILLING_ISSUE',
            'PRODUCT_CHANGE',
            'TRANSFER',
            'NON_RENEWING_PURCHASE',
            'UNCANCELLATION',
            'SUBSCRIPTION_PAUSED',
            'SUBSCRIPTION_EXTENDED'
        ]),
        app_user_id: z.string(),
        product_id: z.string().optional(),
        purchased_at_ms: z.number().optional(),
        expiration_at_ms: z.number().nullable().optional(),
        environment: z.enum(['PRODUCTION', 'SANDBOX']).optional(),
        entitlement_ids: z.array(z.string()).optional(),
        entitlement_id: z.string().optional(),
        store: z.string().optional(),
    }),
});

// Export validation middlewares
export const validateSyncSubscription = validate(syncSubscriptionSchema);
export const validateRevenueCatWebhook = validate(revenueCatWebhookSchema);
