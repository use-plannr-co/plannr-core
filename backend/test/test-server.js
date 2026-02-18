import express from 'express';
import cors from 'cors';

// Simple test server to test import routes
const app = express();
const PORT = 3001; // Different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ success: true, message: 'Test server running' });
});

// Test route to verify basic functionality
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Import module routes are accessible',
        timestamp: new Date().toISOString(),
    });
});

// Mock database for testing
const mockDb = {
    connections: [],
    sessions: [],
    tasks: [],
};

// Simple test routes for import functionality
app.get('/api/import/connections', (req, res) => {
    res.json({
        success: true,
        connections: mockDb.connections,
        message: 'Mock connections endpoint working',
    });
});

app.post('/api/import/start', (req, res) => {
    const { provider, options } = req.body;

    if (!provider || provider !== 'microsoft') {
        return res.status(400).json({
            success: false,
            error: 'Only Microsoft provider is supported',
        });
    }

    const sessionId = 'mock-session-' + Date.now();
    const session = {
        id: sessionId,
        provider,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        options,
    };

    mockDb.sessions.push(session);

    res.json({
        success: true,
        session: {
            id: session.id,
            provider: session.provider,
            status: session.status,
        },
        message: 'Mock session created successfully',
    });
});

app.get('/api/import/sessions/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    const session = mockDb.sessions.find((s) => s.id === sessionId);

    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found',
        });
    }

    res.json({
        success: true,
        session,
        message: 'Mock session status retrieved',
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Test server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Test route: http://localhost:${PORT}/api/test`);
    console.log(`📥 Import connections: http://localhost:${PORT}/api/import/connections`);
});

export default app;
