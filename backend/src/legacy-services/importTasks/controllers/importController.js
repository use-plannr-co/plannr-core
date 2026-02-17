import { db } from '../../../config/db.js';
import ImportService from '../services/importService.js';
import MicrosoftOAuthController from './microsoftOAuthController.js';
import { providerConnections, importSessions, taskDrafts } from '../../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

class ImportController {
    constructor() {
        this.importService = new ImportService();
        this.microsoftOAuth = new MicrosoftOAuthController();
    }

    /**
     * GET /api/import/connections
     * Get user's connected providers
     */
    async getConnections(req, res) {
        try {
            const { userId } = req.user;

            const connections = await db
                .select({
                    id: providerConnections.id,
                    provider: providerConnections.provider,
                    displayName: providerConnections.displayName,
                    email: providerConnections.email,
                    lastSyncAt: providerConnections.lastSyncAt,
                    createdAt: providerConnections.createdAt,
                })
                .from(providerConnections)
                .where(eq(providerConnections.userId, userId));

            res.json({
                success: true,
                connections,
            });
        } catch (error) {
            console.error('Error fetching connections:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch connections',
            });
        }
    }

    /**
     * POST /api/import/start
     * Start a new import session
     */
    async startImport(req, res) {
        try {
            const { userId } = req.user;
            const { provider = 'microsoft', options = {} } = req.body;

            if (provider !== 'microsoft') {
                return res.status(400).json({
                    success: false,
                    error: 'Only Microsoft provider is currently supported',
                });
            }

            const session = await this.importService.startImportSession(userId, provider, options);

            res.json({
                success: true,
                session: {
                    id: session.id,
                    provider: session.provider,
                    status: session.status,
                    expiresAt: session.expiresAt,
                },
            });
        } catch (error) {
            console.error('Error starting import:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * POST /api/import/sessions/:sessionId/execute
     * Execute the import for a session
     */
    async executeImport(req, res) {
        try {
            const { sessionId } = req.params;
            const { options = {} } = req.body;

            // For now, only Microsoft is supported
            const result = await this.importService.importMicrosoftTasks(sessionId, options);

            res.json({
                success: true,
                result,
            });
        } catch (error) {
            console.error('Error executing import:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * GET /api/import/sessions/:sessionId/status
     * Get import session status
     */
    async getSessionStatus(req, res) {
        try {
            const { sessionId } = req.params;

            const session = await this.importService.getSessionStatus(sessionId);

            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Import session not found',
                });
            }

            res.json({
                success: true,
                session,
            });
        } catch (error) {
            console.error('Error fetching session status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch session status',
            });
        }
    }

    /**
     * GET /api/import/sessions/:sessionId/tasks
     * Get imported task drafts from a session
     */
    async getSessionTasks(req, res) {
        try {
            const { sessionId } = req.params;
            const { page = 1, limit = 50 } = req.query;

            const offset = (page - 1) * limit;

            const tasks = await db
                .select()
                .from(taskDrafts)
                .where(eq(taskDrafts.sessionId, sessionId))
                .limit(parseInt(limit))
                .offset(parseInt(offset))
                .orderBy(taskDrafts.createdAt);

            const totalCount = await db
                .select({ count: sql`count(*)` })
                .from(taskDrafts)
                .where(eq(taskDrafts.sessionId, sessionId));

            const formattedTasks = tasks.map((task) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                priority: task.priority,
                estimatedDuration: task.estimatedDuration,
                tags: JSON.parse(task.tags || '[]'),
                isCompleted: task.isCompleted,
                completedAt: task.completedAt,
                providerTaskId: task.providerTaskId,
                providerListId: task.providerListId,
                metadata: JSON.parse(task.providerData || '{}'),
                createdAt: task.createdAt,
            }));

            res.json({
                success: true,
                tasks: formattedTasks,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(totalCount[0].count),
                    hasMore: offset + tasks.length < totalCount[0].count,
                },
            });
        } catch (error) {
            console.error('Error fetching session tasks:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch session tasks',
            });
        }
    }

    /**
     * POST /api/import/sessions/:sessionId/enrich
     * Create enrichment request for schedule generation
     */
    async createEnrichmentRequest(req, res) {
        try {
            const { sessionId } = req.params;
            const { scheduleOptions = {} } = req.body;

            const enrichmentRequest = await this.importService.createEnrichmentRequest(
                sessionId,
                scheduleOptions
            );

            res.json({
                success: true,
                enrichmentRequest: {
                    sessionId: enrichmentRequest.sessionId,
                    userId: enrichmentRequest.userId,
                    taskCount: enrichmentRequest.tasks.length,
                    calendarEventCount: enrichmentRequest.calendarEvents.length,
                    scheduleOptions: enrichmentRequest.scheduleOptions,
                },
            });
        } catch (error) {
            console.error('Error creating enrichment request:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * POST /api/import/sessions/:sessionId/generate-schedule
     * Generate schedule from imported tasks and calendar events
     */
    async generateSchedule(req, res) {
        try {
            const { sessionId } = req.params;
            const { scheduleOptions = {} } = req.body;
            const { userId } = req.user;

            // Create enrichment request
            const enrichmentRequest = await this.importService.createEnrichmentRequest(
                sessionId,
                scheduleOptions
            );

            // Here we would integrate with the existing scheduling system
            // For now, return the enrichment data that can be used by the frontend
            // to call the existing generateSchedule endpoint

            // Import the existing schedule generation functions
            const { generateScheduleFromImport } =
                await import('../../../modules/schedules/services/scheduleService.js');

            const scheduleResult = await generateScheduleFromImport(
                userId,
                enrichmentRequest.tasks,
                enrichmentRequest.calendarEvents,
                enrichmentRequest.scheduleOptions
            );

            res.json({
                success: true,
                schedule: scheduleResult,
                metadata: {
                    sessionId,
                    tasksScheduled: enrichmentRequest.tasks.length,
                    calendarEventsConsidered: enrichmentRequest.calendarEvents.length,
                    strategy: enrichmentRequest.scheduleOptions.strategy,
                },
            });
        } catch (error) {
            console.error('Error generating schedule:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * DELETE /api/import/sessions/:sessionId
     * Delete an import session and its task drafts
     */
    async deleteSession(req, res) {
        try {
            const { sessionId } = req.params;
            const { userId } = req.user;

            // Verify session belongs to user
            const [session] = await db
                .select()
                .from(importSessions)
                .where(and(eq(importSessions.id, sessionId), eq(importSessions.userId, userId)))
                .limit(1);

            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Import session not found',
                });
            }

            // Delete task drafts first
            await db.delete(taskDrafts).where(eq(taskDrafts.sessionId, sessionId));

            // Delete session
            await db.delete(importSessions).where(eq(importSessions.id, sessionId));

            res.json({
                success: true,
                message: 'Import session deleted successfully',
            });
        } catch (error) {
            console.error('Error deleting session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete session',
            });
        }
    }

    /**
     * GET /api/import/cleanup
     * Clean up expired sessions (admin endpoint)
     */
    async cleanupSessions(req, res) {
        try {
            const cleanedCount = await this.importService.cleanupExpiredSessions();

            res.json({
                success: true,
                message: `Cleaned up ${cleanedCount} expired sessions`,
            });
        } catch (error) {
            console.error('Error cleaning up sessions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clean up sessions',
            });
        }
    }
}

export default ImportController;
