import crypto from 'crypto';
import { db } from '../../../config/db.js';
import GraphClient from '../providers/microsoft/graphClient.js';
import MicrosoftOAuthController from '../controllers/microsoftOAuthController.js';
import {
    mapTaskListFromMicrosoft,
    mapTaskFromMicrosoft,
    mapCalendarEventFromMicrosoft,
} from '../mappers/microsoftMapper.js';
import { ImportSessionDTO, EnrichmentRequestDTO } from '../dtos/index.js';
import { providerConnections, importSessions, taskDrafts } from '../../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

class ImportService {
    constructor() {
        this.oauthController = new MicrosoftOAuthController();
    }

    /**
     * Start a new import session for a user
     */
    async startImportSession(userId, provider = 'microsoft', options = {}) {
        try {
            // Validate user has connection to provider
            const [connection] = await db
                .select()
                .from(providerConnections)
                .where(
                    and(
                        eq(providerConnections.userId, userId),
                        eq(providerConnections.provider, provider)
                    )
                )
                .limit(1);

            if (!connection) {
                throw new Error(
                    `No ${provider} connection found. Please connect your account first.`
                );
            }

            // Create new import session
            const sessionId = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            const [session] = await db
                .insert(importSessions)
                .values({
                    id: sessionId,
                    userId,
                    provider,
                    sessionType: 'task_import',
                    status: 'in_progress',
                    metadata: JSON.stringify({
                        options,
                        startedAt: new Date().toISOString(),
                        connectionId: connection.id,
                    }),
                    expiresAt,
                })
                .returning();

            return new ImportSessionDTO({
                id: session.id,
                userId: session.userId,
                provider: session.provider,
                status: session.status,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
                metadata: JSON.parse(session.metadata),
            });
        } catch (error) {
            console.error('Error starting import session:', error);
            throw new Error(`Failed to start import session: ${error.message}`);
        }
    }

    /**
     * Import tasks from Microsoft To-Do
     */
    async importMicrosoftTasks(sessionId, options = {}) {
        try {
            // Get session details
            const [session] = await db
                .select()
                .from(importSessions)
                .where(eq(importSessions.id, sessionId))
                .limit(1);

            if (!session || session.status !== 'in_progress') {
                throw new Error('Invalid or expired import session');
            }

            const sessionMetadata = JSON.parse(session.metadata);
            const { connectionId } = sessionMetadata;

            // Get valid access token
            const accessToken = await this.oauthController.getValidAccessToken(session.userId);
            const graphClient = new GraphClient(accessToken);

            // Update session status
            await this.updateSessionStatus(sessionId, 'fetching_data', {
                ...sessionMetadata,
                currentStep: 'Fetching task lists from Microsoft To-Do',
            });

            // Get all task lists
            const taskLists = await graphClient.getTaskLists();
            const mappedTaskLists = taskLists.map(mapTaskListFromMicrosoft);

            let totalTasksImported = 0;
            const importedLists = [];
            const errors = [];

            // Process each task list
            for (const [index, taskList] of mappedTaskLists.entries()) {
                try {
                    await this.updateSessionStatus(sessionId, 'fetching_data', {
                        ...sessionMetadata,
                        currentStep: `Processing list "${taskList.name}" (${index + 1}/${mappedTaskLists.length})`,
                    });

                    // Skip completed tasks if specified
                    const includeCompleted = options.includeCompletedTasks !== false;

                    // Get tasks from this list
                    const tasks = await graphClient.getTasks(taskList.id, includeCompleted);
                    const mappedTasks = tasks.map((task) =>
                        mapTaskFromMicrosoft(task, taskList.id)
                    );

                    // Filter tasks based on options
                    let filteredTasks = mappedTasks;

                    if (options.dueDateFilter) {
                        const { before, after } = options.dueDateFilter;
                        filteredTasks = filteredTasks.filter((task) => {
                            if (!task.dueDate) return !options.dueDateFilter.requireDueDate;
                            const dueDate = new Date(task.dueDate);
                            if (before && dueDate > new Date(before)) return false;
                            if (after && dueDate < new Date(after)) return false;
                            return true;
                        });
                    }

                    if (options.selectedLists && options.selectedLists.length > 0) {
                        if (!options.selectedLists.includes(taskList.id)) {
                            continue; // Skip this list
                        }
                    }

                    // Store task drafts in database
                    for (const taskDraft of filteredTasks) {
                        await db.insert(taskDrafts).values({
                            sessionId,
                            title: taskDraft.title,
                            description: taskDraft.description,
                            dueDate: taskDraft.dueDate,
                            priority: taskDraft.priority,
                            estimatedDuration: taskDraft.estimatedDuration,
                            tags: JSON.stringify(taskDraft.tags),
                            isCompleted: taskDraft.isCompleted,
                            completedAt: taskDraft.completedAt,
                            providerTaskId: taskDraft.providerTaskId,
                            providerListId: taskDraft.providerListId,
                            providerData: JSON.stringify(taskDraft.metadata),
                        });
                    }

                    importedLists.push({
                        ...taskList,
                        taskCount: filteredTasks.length,
                        totalTasks: tasks.length,
                    });

                    totalTasksImported += filteredTasks.length;
                } catch (listError) {
                    console.error(`Error processing task list ${taskList.name}:`, listError);
                    errors.push({
                        listId: taskList.id,
                        listName: taskList.name,
                        error: listError.message,
                    });
                }
            }

            // Update session with results
            const finalMetadata = {
                ...sessionMetadata,
                results: {
                    totalLists: mappedTaskLists.length,
                    importedLists,
                    totalTasksImported,
                    errors,
                    completedAt: new Date().toISOString(),
                },
            };

            const finalStatus = errors.length > 0 ? 'completed_with_errors' : 'completed';
            await this.updateSessionStatus(sessionId, finalStatus, finalMetadata);

            return {
                sessionId,
                status: finalStatus,
                totalTasksImported,
                totalLists: mappedTaskLists.length,
                importedLists,
                errors,
            };
        } catch (error) {
            console.error('Microsoft import error:', error);

            // Update session with error
            await this.updateSessionStatus(sessionId, 'failed', {
                error: error.message,
                failedAt: new Date().toISOString(),
            });

            throw new Error(`Microsoft import failed: ${error.message}`);
        }
    }

    /**
     * Get calendar events for schedule enrichment
     */
    async getCalendarEvents(userId, startDate, endDate, provider = 'microsoft') {
        try {
            const accessToken = await this.oauthController.getValidAccessToken(userId);
            const graphClient = new GraphClient(accessToken);

            const events = await graphClient.getCalendarEvents(startDate, endDate);
            return events.map(mapCalendarEventFromMicrosoft);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            throw new Error(`Failed to fetch calendar events: ${error.message}`);
        }
    }

    /**
     * Create enrichment request for schedule generation
     */
    async createEnrichmentRequest(sessionId, scheduleOptions = {}) {
        try {
            // Get session and validate
            const [session] = await db
                .select()
                .from(importSessions)
                .where(eq(importSessions.id, sessionId))
                .limit(1);

            if (!session) {
                throw new Error('Import session not found');
            }

            if (!['completed', 'completed_with_errors'].includes(session.status)) {
                throw new Error(
                    'Import session must be completed before creating enrichment request'
                );
            }

            // Get task drafts from session
            const tasks = await db
                .select()
                .from(taskDrafts)
                .where(eq(taskDrafts.sessionId, sessionId));

            if (tasks.length === 0) {
                throw new Error('No tasks found in import session');
            }

            // Get calendar events for the requested date range
            const startDate = new Date(scheduleOptions.startDate || new Date());
            const endDate = new Date(
                scheduleOptions.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ); // 30 days default

            const calendarEvents = await this.getCalendarEvents(
                session.userId,
                startDate,
                endDate,
                session.provider
            );

            // Create enrichment request
            const enrichmentRequest = new EnrichmentRequestDTO({
                sessionId,
                userId: session.userId,
                tasks: tasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    estimatedDuration: task.estimatedDuration,
                    tags: JSON.parse(task.tags || '[]'),
                    isCompleted: task.isCompleted,
                })),
                calendarEvents,
                scheduleOptions: {
                    startDate,
                    endDate,
                    workingHours: scheduleOptions.workingHours || { start: 9, end: 17 },
                    workingDays: scheduleOptions.workingDays || [1, 2, 3, 4, 5], // Mon-Fri
                    strategy: scheduleOptions.strategy || 'balanced',
                    bufferTime: scheduleOptions.bufferTime || 15,
                    ...scheduleOptions,
                },
            });

            return enrichmentRequest;
        } catch (error) {
            console.error('Error creating enrichment request:', error);
            throw new Error(`Failed to create enrichment request: ${error.message}`);
        }
    }

    /**
     * Get import session status
     */
    async getSessionStatus(sessionId) {
        try {
            const [session] = await db
                .select()
                .from(importSessions)
                .where(eq(importSessions.id, sessionId))
                .limit(1);

            if (!session) {
                return null;
            }

            const taskCount = await db
                .select({ count: sql`count(*)` })
                .from(taskDrafts)
                .where(eq(taskDrafts.sessionId, sessionId));

            return new ImportSessionDTO({
                id: session.id,
                userId: session.userId,
                provider: session.provider,
                status: session.status,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
                metadata: {
                    ...JSON.parse(session.metadata),
                    taskCount: parseInt(taskCount[0].count),
                },
            });
        } catch (error) {
            console.error('Error getting session status:', error);
            throw new Error(`Failed to get session status: ${error.message}`);
        }
    }

    /**
     * Update import session status and metadata
     */
    async updateSessionStatus(sessionId, status, metadata = {}) {
        try {
            await db
                .update(importSessions)
                .set({
                    status,
                    metadata: JSON.stringify(metadata),
                    updatedAt: new Date(),
                })
                .where(eq(importSessions.id, sessionId));
        } catch (error) {
            console.error('Error updating session status:', error);
        }
    }

    /**
     * Clean up expired sessions and task drafts
     */
    async cleanupExpiredSessions() {
        try {
            const expiredSessions = await db
                .select({ id: importSessions.id })
                .from(importSessions)
                .where(sql`${importSessions.expiresAt} < NOW()`);

            for (const session of expiredSessions) {
                // Delete task drafts first (foreign key constraint)
                await db.delete(taskDrafts).where(eq(taskDrafts.sessionId, session.id));

                // Delete session
                await db.delete(importSessions).where(eq(importSessions.id, session.id));
            }

            return expiredSessions.length;
        } catch (error) {
            console.error('Error cleaning up expired sessions:', error);
            return 0;
        }
    }
}

export default ImportService;
