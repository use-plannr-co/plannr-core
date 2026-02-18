import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ENV } from '../config/env.js';

/**
 * Rate limiter for text-to-tasks feature
 * Limits users to configurable parses per hour to prevent abuse and control costs
 */
export const textToTasksRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: ENV.TEXT_TO_TASKS_RATE_LIMIT, // Configurable limit (default: 10)
    message: {
        error: 'TOO_MANY_REQUESTS',
        message: `Too many text-to-tasks requests. You can make ${ENV.TEXT_TO_TASKS_RATE_LIMIT} requests per hour. Please try again later.`,
        retryAfter: '3600', // seconds
        limit: ENV.TEXT_TO_TASKS_RATE_LIMIT,
        windowMs: 3600000,
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
        // Use user ID for rate limiting (from authentication middleware)
        return req.user?.id || req.headers['x-clerk-user-id'] || ipKeyGenerator(req);
    },
    skip: (req) => {
        // Skip rate limiting in development environment if configured
        return ENV.NODE_ENV === 'development' && ENV.SKIP_RATE_LIMITS;
    },
    handler: (req, res, next) => {
        const userId = req.user?.id || req.headers['x-clerk-user-id'] || 'unknown';
        console.warn(`🚫 Rate limit exceeded for text-to-tasks - User: ${userId}`);

        res.status(429).json({
            success: false,
            error: 'TOO_MANY_REQUESTS',
            message: `You have reached the limit of ${ENV.TEXT_TO_TASKS_RATE_LIMIT} text-to-tasks requests per hour. Please try again later.`,
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
            limit: ENV.TEXT_TO_TASKS_RATE_LIMIT,
            remaining: 0,
            resetTime: new Date(req.rateLimit.resetTime).toISOString(),
        });
    },
});

/**
 * General API rate limiter for other endpoints
 * More generous limits for regular API usage
 */
export const generalApiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: ENV.GENERAL_API_RATE_LIMIT, // Configurable limit (default: 100)
    message: {
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP. Please try again later.',
        retryAfter: '900', // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use user ID if available, otherwise fall back to IPv6-safe IP
        return req.user?.id || req.headers['x-clerk-user-id'] || ipKeyGenerator(req);
    },
    skip: (req) => {
        // Skip rate limiting in development if configured
        return ENV.NODE_ENV === 'development' && ENV.SKIP_RATE_LIMITS;
    },
});

/**
 * Strict rate limiter for sensitive operations (user management, auth)
 */
export const strictRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Only 5 requests per hour for sensitive operations
    message: {
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many sensitive requests. Please try again in an hour for security reasons.',
        retryAfter: '3600',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.headers['x-clerk-user-id'] || ipKeyGenerator(req);
    },
    skip: (req) => {
        return ENV.NODE_ENV === 'development' && ENV.SKIP_RATE_LIMITS;
    },
});
