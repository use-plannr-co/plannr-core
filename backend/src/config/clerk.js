import { createClerkClient } from '@clerk/backend';
import { ENV } from './env.js';

// Initialize Clerk client
export const clerkClient = createClerkClient({
    secretKey: ENV.CLERK_SECRET_KEY,
});

// Middleware to verify Clerk JWT tokens
export const verifyClerkToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Missing or invalid authorization header',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the token with Clerk
        const payload = await clerkClient.verifyToken(token);

        // Add user info to request
        req.clerkUser = payload;
        req.headers['x-clerk-user-id'] = payload.sub; // Clerk user ID is in the 'sub' claim

        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            error: error.message,
        });
    }
};
