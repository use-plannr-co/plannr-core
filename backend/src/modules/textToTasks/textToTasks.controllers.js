import crypto from 'crypto';
import * as repo from './textToTasks.repo.js';
import * as schedulesRepo from '../schedules/schedules.repo.js';
import * as userRepo from '../users/users.repo.js';
import llmProvider from '../../services/llm/index.js';
import {
    TaskDraftSchema,
    WarningCodeEnum,
    PriorityEnum,
    ActivityTypeEnum,
} from './textToTasks.validators.js';

/**
 * Text-to-Tasks Controllers
 * Handles text parsing, enrichment, and schedule generation
 */

// Utility functions
const generateInputHash = (text) => {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
};

const generateInputStats = (text) => {
    const lines = text.split('\n').length;
    const chars = text.length;

    // Simple heuristic to detect likely task items
    const bulletPoints = (text.match(/^[\s]*[-*•]\s+/gm) || []).length;
    const numberedItems = (text.match(/^[\s]*\d+\.\s+/gm) || []).length;
    const lineBreaks = (text.match(/\n\s*\n/g) || []).length;

    const itemsDetected = Math.max(bulletPoints, numberedItems, Math.max(1, lines - lineBreaks));

    return { chars, lines, itemsDetected };
};

const validateLLMOutput = (llmTasks) => {
    const validTasks = [];
    const warnings = [];

    if (!Array.isArray(llmTasks)) {
        warnings.push({
            code: 'INVALID_FORMAT',
            message: 'LLM output is not an array',
            draftIndex: null,
        });
        return { validTasks, warnings };
    }

    const validActivityTypes = [
        'PERSONAL',
        'MEETING',
        'WORK',
        'EVENT',
        'EDUCATION',
        'TRAVEL',
        'RECREATIONAL',
        'ERRAND',
        'OTHER',
        'BREAK',
    ];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];

    llmTasks.forEach((task, index) => {
        try {
            // Basic validation for required FlexibleEvent fields
            if (!task.name || typeof task.name !== 'string') {
                warnings.push({
                    code: 'MISSING_NAME',
                    message: `Task ${index + 1} missing name`,
                    draftIndex: index,
                });
                return;
            }

            if (!task.type || !validActivityTypes.includes(task.type)) {
                warnings.push({
                    code: 'INVALID_ACTIVITY_TYPE',
                    message: `Task ${index + 1} has invalid activity type: ${task.type}`,
                    draftIndex: index,
                });
                return;
            }

            if (!task.duration || !Number.isInteger(task.duration) || task.duration <= 0) {
                warnings.push({
                    code: 'INVALID_DURATION',
                    message: `Task ${index + 1} missing or invalid duration`,
                    draftIndex: index,
                });
                return;
            }

            if (!task.priority || !validPriorities.includes(task.priority)) {
                warnings.push({
                    code: 'INVALID_PRIORITY',
                    message: `Task ${index + 1} has invalid priority: ${task.priority}`,
                    draftIndex: index,
                });
                return;
            }

            // Normalize and validate FlexibleEvent structure
            const normalizedTask = {
                name: task.name.substring(0, 200),
                type: task.type,
                duration: Math.min(task.duration, 480), // Max 8 hours
                priority: task.priority,
                deadline: null,
                id: task.id || null, // Will be generated later if needed
            };

            // Validate deadline structure if provided
            if (task.deadline && task.deadline !== null) {
                if (
                    typeof task.deadline === 'object' &&
                    Number.isInteger(task.deadline.date) &&
                    Number.isInteger(task.deadline.month) &&
                    Number.isInteger(task.deadline.year)
                ) {
                    // Basic date validation
                    if (
                        task.deadline.date >= 1 &&
                        task.deadline.date <= 31 &&
                        task.deadline.month >= 1 &&
                        task.deadline.month <= 12 &&
                        task.deadline.year >= 2024 &&
                        task.deadline.year <= 2030
                    ) {
                        normalizedTask.deadline = task.deadline;
                    } else {
                        warnings.push({
                            code: 'INVALID_DEADLINE_VALUES',
                            message: `Task ${index + 1} has invalid deadline date values`,
                            draftIndex: index,
                        });
                    }
                } else {
                    warnings.push({
                        code: 'INVALID_DEADLINE_FORMAT',
                        message: `Task ${index + 1} has invalid deadline format`,
                        draftIndex: index,
                    });
                }
            }

            // Generate task-level warnings for FlexibleEvent context
            const taskWarnings = [];

            if (normalizedTask.duration < 15) {
                taskWarnings.push({
                    code: 'SHORT_DURATION',
                    message: 'Very short duration detected',
                    field: 'duration',
                });
            }

            if (normalizedTask.duration > 240) {
                taskWarnings.push({
                    code: 'LONG_DURATION',
                    message: 'Very long duration detected',
                    field: 'duration',
                });
            }

            normalizedTask.warnings = taskWarnings;
            validTasks.push(normalizedTask);
        } catch (error) {
            warnings.push({
                code: 'VALIDATION_ERROR',
                message: `Task ${index + 1} validation failed: ${error.message}`,
                draftIndex: index,
            });
        }
    });

    return { validTasks, warnings };
};

const convertLLMTasksToDrafts = (sessionId, validTasks) => {
    return validTasks.map((task, index) => ({
        sessionId,
        orderIndex: index,
        title: task.name, // Map FlexibleEvent 'name' to draft 'title'
        notes: `Activity Type: ${task.type}`, // Store type in notes for reference
        deadline: task.deadline
            ? // Convert ScheduleDate to timestamp for database storage
              new Date(task.deadline.year, task.deadline.month - 1, task.deadline.date)
            : null,
        preferredStart: null, // FlexibleEvents don't have preferredStart
        priority: task.priority,
        durationMinutes: task.duration, // Map FlexibleEvent 'duration' to 'durationMinutes'
        included: true,
        warnings: task.warnings || [],
        confidence: null, // FlexibleEvent doesn't have confidence
        enrichment: {
            // Store the original FlexibleEvent data for later reconstruction
            originalFlexibleEvent: {
                name: task.name,
                type: task.type,
                duration: task.duration,
                priority: task.priority,
                deadline: task.deadline,
                id: task.id,
            },
        },
    }));
};

/**
 * Parse endpoint: Convert pasted text to task drafts
 */
export const parseText = async (req, res, next) => {
    try {
        const { text, preferences = {} } = req.validated.body;
        const clerkUserId = req.headers['x-clerk-user-id'];

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // Get user from Clerk ID
        const user = await userRepo.getUserByClerkId(clerkUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const userId = user.id;

        // Generate input hash and stats (don't store raw text)
        const inputHash = generateInputHash(text);
        const inputStats = generateInputStats(text);

        console.log(`Parsing text for user ${userId}, hash: ${inputHash.substring(0, 8)}...`);

        let llmResult;
        let repairAttempted = false;

        try {
            // Initial LLM parsing attempt
            llmResult = await llmProvider.parseTasksFromText({ text, prefs: preferences });
        } catch (initialError) {
            console.error('Initial LLM parsing failed:', initialError.message);

            try {
                // Attempt repair
                llmResult = await llmProvider.repairTasksParse(text, '', initialError.message);
                repairAttempted = true;
                console.log('LLM repair attempt succeeded');
            } catch (repairError) {
                console.error('LLM repair also failed:', repairError.message);

                // Create failed session for tracking
                const failedSession = await repo.createSession({
                    userId,
                    status: 'failed',
                    inputHash,
                    inputStats,
                    llmProvider: 'gemini',
                    llmModel: 'gemini-2.0-flash-lite',
                    llmTokensIn: 0,
                    llmTokensOut: 0,
                    parseLatencyMs: 0,
                });

                return res.status(200).json({
                    success: true,
                    data: {
                        sessionId: failedSession.id,
                        drafts: [],
                        warnings: [
                            {
                                code: 'PARSE_FAILED',
                                message:
                                    'Unable to parse text into tasks. Please try reformatting your input.',
                            },
                        ],
                        meta: {
                            inputStats,
                            llmProvider: 'gemini',
                            llmModel: 'gemini-2.0-flash-lite',
                            tokensUsed: 0,
                            parseLatencyMs: 0,
                            repairAttempted: true,
                        },
                    },
                });
            }
        }

        // Validate and normalize LLM output
        const { validTasks, warnings } = validateLLMOutput(llmResult.tasks);

        // Create session
        const session = await repo.createSession({
            userId,
            status: 'parsing',
            inputHash,
            inputStats,
            llmProvider: llmResult.provider,
            llmModel: llmResult.model,
            llmTokensIn: llmResult.usage.promptTokens,
            llmTokensOut: llmResult.usage.completionTokens,
            parseLatencyMs: llmResult.usage.latencyMs,
        });

        // Create draft tasks
        const draftData = convertLLMTasksToDrafts(session.id, validTasks);
        const drafts = await repo.createDrafts(draftData);

        // Limit returned drafts
        const limitedDrafts = drafts.slice(0, 200);

        console.log(`Created ${drafts.length} drafts for session ${session.id}`);

        res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                drafts: limitedDrafts,
                warnings,
                meta: {
                    inputStats,
                    llmProvider: llmResult.provider,
                    llmModel: llmResult.model,
                    tokensUsed: llmResult.usage.totalTokens,
                    parseLatencyMs: llmResult.usage.latencyMs,
                    repairAttempted,
                },
            },
        });
    } catch (error) {
        console.error('Parse text error:', error);
        next(error);
    }
};

/**
 * Get drafts for a session
 */
export const getDrafts = async (req, res, next) => {
    try {
        const { sessionId } = req.validated.params;
        const { includeExcluded } = req.validated.query;
        const clerkUserId = req.headers['x-clerk-user-id'];

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // Get user from Clerk ID
        const user = await userRepo.getUserByClerkId(clerkUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const userId = user.id;

        const session = await repo.getSessionById(sessionId, userId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        const drafts = await repo.getDraftsBySessionId(sessionId, includeExcluded);

        res.status(200).json({
            success: true,
            data: {
                sessionId,
                drafts,
                status: session.status,
            },
        });
    } catch (error) {
        console.error('Get drafts error:', error);
        next(error);
    }
};

/**
 * Enrich drafts with defaults and user overrides
 */
export const enrichDrafts = async (req, res, next) => {
    try {
        const { sessionId, defaults = {}, overrides = {} } = req.validated.body;
        const clerkUserId = req.headers['x-clerk-user-id'];

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // Get user from Clerk ID
        const user = await userRepo.getUserByClerkId(clerkUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const userId = user.id;

        const session = await repo.getSessionById(sessionId, userId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        const currentDrafts = await repo.getDraftsBySessionId(sessionId, true);

        // Apply enrichment to each draft
        const enrichedDrafts = [];
        const updates = [];

        for (const draft of currentDrafts) {
            const override = overrides[draft.id] || {};

            // Build enriched draft
            const enriched = {
                ...draft,
                // Apply defaults first
                durationMinutes: draft.durationMinutes || defaults.duration || null,
                priority: draft.priority || defaults.priority || 'MEDIUM',
                deadline:
                    draft.deadline || (defaults.deadline ? new Date(defaults.deadline) : null),
                preferredStart:
                    draft.preferredStart ||
                    (defaults.startTime ? new Date(defaults.startTime) : null),
                // Apply overrides
                ...Object.fromEntries(
                    Object.entries(override).filter(([key, value]) => value !== undefined)
                ),
                // Track enrichment
                enrichment: {
                    appliedDefaults: Object.keys(defaults).filter(
                        (key) => !draft[key] && defaults[key]
                    ),
                    appliedOverrides: Object.keys(override),
                    enrichedAt: new Date().toISOString(),
                },
            };

            // Validate enriched task
            if (enriched.title && enriched.title.length > 0) {
                enrichedDrafts.push(enriched);
                updates.push({
                    id: draft.id,
                    ...enriched,
                });
            }
        }

        // Update drafts in database
        await repo.updateMultipleDrafts(updates);

        // Update session status
        await repo.updateSession(sessionId, { status: 'enriching' });

        // Check if ready to schedule
        const includedDrafts = enrichedDrafts.filter((d) => d.included);
        const readyToSchedule =
            includedDrafts.length > 0 &&
            includedDrafts.every((d) => d.durationMinutes && d.durationMinutes > 0);

        res.status(200).json({
            success: true,
            data: {
                sessionId,
                drafts: enrichedDrafts,
                readyToSchedule,
                meta: {
                    totalTasks: enrichedDrafts.length,
                    includedTasks: includedDrafts.length,
                    tasksWithDuration: includedDrafts.filter((d) => d.durationMinutes).length,
                    tasksWithDeadlines: includedDrafts.filter((d) => d.deadline).length,
                },
            },
        });
    } catch (error) {
        console.error('Enrich drafts error:', error);
        next(error);
    }
};

/**
 * Generate schedule from enriched drafts
 */
export const generateSchedule = async (req, res, next) => {
    try {
        const {
            sessionId,
            dateRange,
            strategy = 'earliest-fit',
            workingHours = {},
        } = req.validated.body;
        const clerkUserId = req.headers['x-clerk-user-id'];

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // Get user from Clerk ID
        const user = await userRepo.getUserByClerkId(clerkUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const userId = user.id;

        const session = await repo.getSessionById(sessionId, userId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        const drafts = await repo.getDraftsBySessionId(sessionId, false);
        const schedulableDrafts = drafts.filter(
            (d) => d.included && d.durationMinutes && d.durationMinutes > 0
        );

        if (schedulableDrafts.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    'No schedulable tasks found. Ensure tasks have durations and are included.',
            });
        }

        // Convert drafts to flexible events format for existing scheduler
        const flexibleEvents = schedulableDrafts.map((draft) => {
            // Try to get original FlexibleEvent data from enrichment
            const originalEvent = draft.enrichment?.originalFlexibleEvent;

            const flexEvent = {
                name: draft.title,
                type: 'flexible',
                duration: draft.durationMinutes,
                priority: draft.priority,
                // Use original activity type if available, otherwise default to WORK
                activityType: originalEvent?.type || 'WORK',
                frontendId: originalEvent?.id || crypto.randomUUID(),
            };

            // Add deadline if present
            if (draft.deadline) {
                // Convert database timestamp back to ScheduleDate format
                const deadlineDate = new Date(draft.deadline);
                flexEvent.deadline = {
                    date: deadlineDate.getDate(),
                    month: deadlineDate.getMonth() + 1,
                    year: deadlineDate.getFullYear(),
                };
            }

            return flexEvent;
        });

        // Build schedule creation request matching existing format
        const scheduleRequest = {
            // Basic schedule metadata
            title: `AI Generated Schedule - ${new Date().toISOString().split('T')[0]}`,
            numDays: Math.ceil(
                (new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)
            ),
            day1Date: {
                date: new Date(dateRange.start).getDate(),
                month: new Date(dateRange.start).getMonth() + 1,
                year: new Date(dateRange.start).getFullYear(),
            },
            day1Day: new Date(dateRange.start).toLocaleDateString('en-US', { weekday: 'long' }),
            minGap: 15,
            workingHoursLimit: workingHours.maxHoursPerDay || 8,
            strategy,
            startTime: workingHours.start || 900, // 9:00 AM
            endTime: workingHours.end || 1700, // 5:00 PM
            isActive: true,

            // Events to schedule
            flexibleEvents,
            rigidEvents: [], // No rigid events from text parsing

            // Dependencies (empty for text-to-tasks)
            eventDependencies: {},
        };

        console.log(`Generating schedule for ${flexibleEvents.length} events`);

        // Call existing schedule creation logic (just create the schedule, not events yet)
        const schedule = await schedulesRepo.createSchedule({
            title: scheduleRequest.title,
            ownerId: userId,
            numDays: scheduleRequest.numDays,
            day1Date: scheduleRequest.day1Date,
            day1Day: scheduleRequest.day1Day,
            minGap: scheduleRequest.minGap,
            workingHoursLimit: scheduleRequest.workingHoursLimit,
            strategy: scheduleRequest.strategy,
            startTime: scheduleRequest.startTime,
            endTime: scheduleRequest.endTime,
            isActive: scheduleRequest.isActive,
            metadata: {
                generatedFromText: true,
                sessionId,
                originalTaskCount: drafts.length,
            },
        });

        // Update session with schedule info
        await repo.updateSession(sessionId, {
            status: 'scheduled',
            dateRangeStart: new Date(dateRange.start),
            dateRangeEnd: new Date(dateRange.end),
        });

        // Calculate stats
        const totalDuration = schedulableDrafts.reduce((sum, d) => sum + d.durationMinutes, 0);
        const scheduleSpan = {
            start: dateRange.start,
            end: dateRange.end,
            days: scheduleRequest.numDays,
        };

        res.status(201).json({
            success: true,
            data: {
                sessionId,
                scheduleId: schedule.id,
                stats: {
                    totalTasks: drafts.length,
                    scheduledTasks: schedulableDrafts.length,
                    unscheduledTasks: drafts.length - schedulableDrafts.length,
                    totalDuration,
                    scheduleSpan,
                },
            },
        });
    } catch (error) {
        console.error('Generate schedule error:', error);
        next(error);
    }
};

/**
 * Delete session and all associated drafts
 */
export const deleteSession = async (req, res, next) => {
    try {
        const { sessionId } = req.validated.params;
        const clerkUserId = req.headers['x-clerk-user-id'];

        if (!clerkUserId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // Get user from Clerk ID
        const user = await userRepo.getUserByClerkId(clerkUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const userId = user.id;

        await repo.deleteSession(sessionId, userId);

        res.status(200).json({
            success: true,
            message: 'Session deleted successfully',
        });
    } catch (error) {
        console.error('Delete session error:', error);
        next(error);
    }
};
