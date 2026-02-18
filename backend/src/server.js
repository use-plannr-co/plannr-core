import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/error.js';
import { enforceMinAppVersion } from './middleware/enforceMinAppVersion.js';
import { generalApiRateLimit } from './middleware/rateLimiters.js';
import { startCronJobs, stopCronJobs } from './config/cron.js';

const app = express();
const PORT = ENV.PORT;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting to all API routes
// app.use('/api', generalApiRateLimit);

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Apply version enforcement middleware globally to all API routes
// This must come before the protected routes but after basic middleware
app.use(enforceMinAppVersion);

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Plannr Backend Server is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);

    // Start cron jobs for keep-alive
    startCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    stopCronJobs();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    stopCronJobs();
    process.exit(0);
});
