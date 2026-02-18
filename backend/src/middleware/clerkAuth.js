import { clerkClient } from '../config/clerk.js';

/**
 * Middleware to verify Clerk session tokens
 * Add this to your backend to authenticate API requests
 */
export const verifyClerkSession = async (req, res, next) => {
    try {
        const sessionToken = req.headers['authorization']?.replace('Bearer ', '');

        if (!sessionToken) {
            return res.status(401).json({
                success: false,
                message: 'No session token provided',
            });
        }

        // Verify the session with Clerk
        const session = await clerkClient.sessions.verifySession(sessionToken);

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session token',
            });
        }

        // Add user info to request
        req.clerkUserId = session.userId;
        req.sessionId = session.id;

        next();
    } catch (error) {
        console.error('Session verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Session verification failed',
        });
    }
};
