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
            // Handle undefined req.body (e.g., GET requests or missing body parser)
            if (req.body === undefined) {
                console.error('[Validator] req.body is undefined for:', {
                    method: req.method,
                    path: req.path,
                    url: req.url,
                });
                return res.status(400).json({
                    success: false,
                    message: 'Request body is required',
                });
            }

            console.log('[Validator] Validating request:', {
                method: req.method,
                path: req.path,
                bodyKeys: Object.keys(req.body || {}),
                body: req.body,
            });

            const validated = schema.parse(req.body);
            req.validatedData = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('[Validator] Zod validation failed:', {
                    method: req.method,
                    path: req.path,
                    body: req.body,
                    errors: error.errors,
                });
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((e) => ({
                        path: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            console.error('[Validator] Unexpected error:', {
                method: req.method,
                path: req.path,
                body: req.body,
                error: error.message,
                stack: error.stack,
            });
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
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
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
            'SUBSCRIPTION_EXTENDED',
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
