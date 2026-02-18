// src/middleware/error.js
import { ZodError } from 'zod';
import { ENV } from '../config/env.js';

/**
 * errorHandler(err, req, res, next)
 * - Converts known errors to HTTP responses
 * - Hides stack traces in production
 */
export function errorHandler(err, req, res, next) {
    // If headers already sent, delegate to Express
    if (res.headersSent) return next(err);

    // Zod validation error (if any leaked here)
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Invalid payload',
            details: err.flatten(),
        });
    }

    // Custom HTTP error support (optional pattern)
    if (err?.status && err?.message) {
        return res.status(err.status).json({
            error: err.message,
            ...(ENV.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
        });
    }

    // Fallback: 500
    console.error('Unhandled error:', err);
    console.error('Error stack:', err?.stack);
    return res.status(500).json({
        error: 'Something went wrong',
        message: ENV.NODE_ENV !== 'production' ? err?.message : undefined,
        ...(ENV.NODE_ENV !== 'production' ? { stack: err?.stack } : {}),
    });
}
