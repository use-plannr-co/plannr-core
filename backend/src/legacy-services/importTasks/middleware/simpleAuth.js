/**
 * Temporary simple auth middleware for development/testing
 * This should be replaced with proper Clerk authentication in production
 */
const simpleAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Missing bearer token',
            });
        }

        // For development - just decode a simple JWT-like structure
        // In production, this should verify with Clerk
        try {
            const decoded = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64').toString());

            req.user = {
                userId: decoded.sub || 'test-user-id',
                email: decoded.email || 'test@example.com',
            };

            req.auth = req.user; // For compatibility

            next();
        } catch (decodeError) {
            // If JWT decode fails, use a test user for development
            req.user = {
                userId: 'test-user-' + Date.now(),
                email: 'test@example.com',
            };
            req.auth = req.user;
            next();
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error',
        });
    }
};

export default simpleAuthMiddleware;
