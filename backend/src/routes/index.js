import express from 'express';
import schedulesRoutes from '../modules/schedules/schedules.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import preferencesRoutes from '../modules/preferences/preferences.routes.js';
import integrationsRoutes from '../modules/integrations/integrations.routes.js';
import textToTasksRoutes from '../modules/textToTasks/textToTasks.routes.js';
import subscriptionsRoutes from '../modules/subscriptions/subscriptions.routes.js';
import chatRoutes from '../modules/chat/chat.routes.js';
import { getMinVersion, getUpdateUrl } from '../config/versionPolicy.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({ success: true });
});

// App version info endpoint
router.get('/app/version', (req, res) => {
    const platform = req.query.platform || req.headers['x-platform'] || 'ios';

    res.status(200).json({
        minVersion: getMinVersion(platform),
        platform: platform.toLowerCase(),
        updateUrl: getUpdateUrl(platform),
    });
});

// Module routes
router.use('/schedules', schedulesRoutes);
router.use('/users', usersRoutes);
router.use('/preferences', preferencesRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/text-to-tasks', textToTasksRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/chat', chatRoutes);

export default router;
