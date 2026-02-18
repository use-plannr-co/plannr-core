import express from 'express';
import ImportController from '../controllers/importController.js';
import MicrosoftOAuthController from '../controllers/microsoftOAuthController.js';
import simpleAuthMiddleware from '../middleware/simpleAuth.js';

const router = express.Router();
const importController = new ImportController();
const microsoftOAuth = new MicrosoftOAuthController();

// All routes require authentication
router.use(simpleAuthMiddleware);

// Microsoft OAuth routes
router.post('/auth/microsoft/initiate', (req, res) => microsoftOAuth.initiateAuth(req, res));

router.get('/auth/microsoft/callback', (req, res) => microsoftOAuth.handleCallback(req, res));

router.delete('/auth/microsoft/disconnect', (req, res) => microsoftOAuth.disconnect(req, res));

// Connection management routes
router.get('/connections', (req, res) => importController.getConnections(req, res));

// Import session routes
router.post('/start', (req, res) => importController.startImport(req, res));

router.post('/sessions/:sessionId/execute', (req, res) => importController.executeImport(req, res));

router.get('/sessions/:sessionId/status', (req, res) =>
    importController.getSessionStatus(req, res)
);

router.get('/sessions/:sessionId/tasks', (req, res) => importController.getSessionTasks(req, res));

router.post('/sessions/:sessionId/enrich', (req, res) =>
    importController.createEnrichmentRequest(req, res)
);

router.post('/sessions/:sessionId/generate-schedule', (req, res) =>
    importController.generateSchedule(req, res)
);

router.delete('/sessions/:sessionId', (req, res) => importController.deleteSession(req, res));

// Admin routes
router.get('/cleanup', (req, res) => importController.cleanupSessions(req, res));

export default router;
