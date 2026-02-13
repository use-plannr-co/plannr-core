import 'dotenv/config';

// Debug environment variables in production
if (process.env.NODE_ENV === 'production') {
    console.log('🔍 Environment variables debug:');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
    console.log('API_URL exists:', !!process.env.API_URL);
    console.log('CLERK_SECRET_KEY exists:', !!process.env.CLERK_SECRET_KEY);
    console.log('CLERK_JWT_KEY exists:', !!process.env.CLERK_JWT_KEY);
    console.log('AUTH_DEV:', process.env.AUTH_DEV);
    console.log('NODE_ENV:', process.env.NODE_ENV);
}

export const ENV = {
    PORT: process.env.PORT || 5001,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV || 'development',
    AUTH_DEV: process.env.AUTH_DEV === 'true', // Only enable dev auth if explicitly set
    API_URL: process.env.API_URL || 'https://plannr-690n.onrender.com', // Your Render deployment URL
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_JWT_KEY: process.env.CLERK_JWT_KEY, // Add this for JWT verification
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    
    // RevenueCat webhook configuration
    REVENUECAT_WEBHOOK_SECRET: process.env.REVENUECAT_WEBHOOK_SECRET,
    
    // Anthropic / Claude
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

    // Rate limiting configuration
    SKIP_RATE_LIMITS: process.env.SKIP_RATE_LIMITS === 'true',
    TEXT_TO_TASKS_RATE_LIMIT: parseInt(process.env.TEXT_TO_TASKS_RATE_LIMIT) || 10, // per hour
    GENERAL_API_RATE_LIMIT: parseInt(process.env.GENERAL_API_RATE_LIMIT) || 100, // per 15 minutes
}