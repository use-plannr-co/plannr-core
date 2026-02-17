import { z } from 'zod';

/**
 * Text-to-Tasks Validation Schemas
 */

// Reuse enums from schedules module
const ActivityTypeEnum = z.enum([
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
]);

const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

const SessionStatusEnum = z.enum(['parsing', 'enriching', 'scheduled', 'failed']);

// Warning codes for FlexibleEvent parsing
const WarningCodeEnum = z.enum([
    'MISSING_DURATION',
    'MISSING_DEADLINE',
    'AMBIGUOUS_DATE',
    'AMBIGUOUS_DURATION',
    'INVALID_ACTIVITY_TYPE',
    'INVALID_PRIORITY',
    'SHORT_DURATION',
    'LONG_DURATION',
    'MISSING_NAME',
    'INVALID_DEADLINE_FORMAT',
    'INVALID_DEADLINE_VALUES',
]);

// Input validation schemas
export const parseInputSchema = z.object({
    text: z
        .string()
        .min(1, 'Text cannot be empty')
        .max(5000, 'Text too long (max 5000 characters)'),
    preferences: z
        .object({
            defaultDuration: z.number().int().min(5).max(480).optional(), // 5min to 8hrs
            defaultPriority: PriorityEnum.optional(),
            defaultActivityType: ActivityTypeEnum.optional(),
            timezone: z.string().optional(),
        })
        .optional()
        .default({}),
});

export const enrichInputSchema = z.object({
    sessionId: z.string().uuid('Invalid session ID'),
    defaults: z
        .object({
            duration: z.number().int().min(5).max(480).optional(),
            priority: PriorityEnum.optional(),
            activityType: ActivityTypeEnum.optional(),
            startTime: z.string().datetime().optional(),
            deadline: z.string().datetime().optional(),
        })
        .optional()
        .default({}),
    overrides: z
        .record(
            z.string().uuid(),
            z.object({
                title: z.string().min(1).max(200).optional(),
                notes: z.string().max(1000).optional(),
                duration: z.number().int().min(5).max(480).optional(),
                priority: PriorityEnum.optional(),
                activityType: ActivityTypeEnum.optional(),
                deadline: z.string().datetime().optional(),
                preferredStart: z.string().datetime().optional(),
                included: z.boolean().optional(),
            })
        )
        .optional()
        .default({}),
});

export const generateInputSchema = z.object({
    sessionId: z.string().uuid('Invalid session ID'),
    dateRange: z.object({
        start: z.string().datetime('Invalid start date'),
        end: z.string().datetime('Invalid end date'),
    }),
    strategy: z
        .enum(['earliest-fit', 'balanced-work', 'deadline-oriented'])
        .optional()
        .default('earliest-fit'),
    workingHours: z
        .object({
            start: z.number().int().min(0).max(2359).optional(), // Time24 format
            end: z.number().int().min(0).max(2359).optional(),
            maxHoursPerDay: z.number().int().min(1).max(16).optional(),
        })
        .optional(),
});

// Output validation schemas - Updated for FlexibleEvent structure
const TaskDraftSchema = z.object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    orderIndex: z.number().int(),
    title: z.string().min(1).max(200), // Maps to FlexibleEvent.name
    notes: z.string().max(1000).nullable(),
    deadline: z.string().datetime().nullable(),
    preferredStart: z.string().datetime().nullable(),
    priority: PriorityEnum,
    durationMinutes: z.number().int().min(5).max(480).nullable(),
    included: z.boolean(),
    warnings: z.array(
        z.object({
            code: WarningCodeEnum,
            message: z.string(),
            field: z.string().optional(),
        })
    ),
    confidence: z.number().min(0).max(1).nullable(),
    enrichment: z.record(z.any()).nullable(),
});

// Stricter schema for schedulable tasks
const SchedulableTaskDraftSchema = TaskDraftSchema.extend({
    durationMinutes: z.number().int().min(5).max(480), // Required for scheduling
    included: z.literal(true), // Only included tasks are schedulable
});

export const parseOutputSchema = z.object({
    sessionId: z.string().uuid(),
    drafts: z.array(TaskDraftSchema),
    warnings: z.array(
        z.object({
            code: WarningCodeEnum,
            message: z.string(),
            draftIndex: z.number().int().optional(),
        })
    ),
    meta: z.object({
        inputStats: z.object({
            chars: z.number().int(),
            lines: z.number().int(),
            itemsDetected: z.number().int(),
        }),
        llmProvider: z.string(),
        llmModel: z.string(),
        tokensUsed: z.number().int(),
        parseLatencyMs: z.number().int(),
        repairAttempted: z.boolean(),
    }),
});

export const enrichOutputSchema = z.object({
    sessionId: z.string().uuid(),
    drafts: z.array(TaskDraftSchema),
    readyToSchedule: z.boolean(),
    meta: z.object({
        totalTasks: z.number().int(),
        includedTasks: z.number().int(),
        tasksWithDuration: z.number().int(),
        tasksWithDeadlines: z.number().int(),
    }),
});

export const generateOutputSchema = z.object({
    sessionId: z.string().uuid(),
    scheduleId: z.string().uuid(),
    stats: z.object({
        totalTasks: z.number().int(),
        scheduledTasks: z.number().int(),
        unscheduledTasks: z.number().int(),
        totalDuration: z.number().int(), // minutes
        scheduleSpan: z.object({
            start: z.string().datetime(),
            end: z.string().datetime(),
            days: z.number().int(),
        }),
    }),
});

// Parameter validation schemas
export const sessionIdParamSchema = z.object({
    sessionId: z.string().uuid('Invalid session ID'),
});

export const getDraftsQuerySchema = z.object({
    includeExcluded: z.boolean().optional().default(false),
});

// Export schemas for reuse
export {
    ActivityTypeEnum,
    PriorityEnum,
    SessionStatusEnum,
    WarningCodeEnum,
    TaskDraftSchema,
    SchedulableTaskDraftSchema,
};
