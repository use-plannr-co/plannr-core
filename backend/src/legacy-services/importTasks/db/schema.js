import {
    pgTable,
    uuid,
    text,
    timestamp,
    boolean,
    integer,
    jsonb,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '../../../db/schema.js';

// Provider connections for OAuth tokens
export const providerConnections = pgTable(
    'provider_connections',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        provider: text('provider').notNull(), // 'microsoft', 'google', etc.
        encryptedAccessToken: text('encrypted_access_token').notNull(),
        encryptedRefreshToken: text('encrypted_refresh_token'),
        expiresAt: timestamp('expires_at', { withTimezone: true }),
        scopes: jsonb('scopes'), // Array of granted scopes
        providerUserId: text('provider_user_id'), // External user ID from provider
        metadata: jsonb('metadata'), // Additional provider-specific data
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    },
    (t) => [index('provider_connections_user_provider_idx').on(t.userId, t.provider)]
);

// Import sessions to track the import workflow
export const importSessions = pgTable(
    'import_sessions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        provider: text('provider').notNull(),
        dateRangeStart: timestamp('date_range_start', { withTimezone: true }).notNull(),
        dateRangeEnd: timestamp('date_range_end', { withTimezone: true }).notNull(),
        selectedListIds: jsonb('selected_list_ids'), // Array of selected task list IDs
        status: text('status').notNull().default('CREATED'), // CREATED|FETCHED|ENRICHED|SCHEDULED
        metadata: jsonb('metadata'), // Additional session data
        scheduleId: uuid('schedule_id'), // Reference to created schedule (nullable)
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    },
    (t) => [
        index('import_sessions_user_status_idx').on(t.userId, t.status),
        index('import_sessions_user_updated_idx').on(t.userId, t.updatedAt),
    ]
);

// Imported task drafts before they become scheduled blocks
export const taskDrafts = pgTable(
    'task_drafts',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        sessionId: uuid('session_id')
            .notNull()
            .references(() => importSessions.id, { onDelete: 'cascade' }),
        sourceTaskId: text('source_task_id').notNull(), // External task ID from provider
        sourceListId: text('source_list_id').notNull(), // External list ID from provider
        title: text('title').notNull(),
        notes: text('notes'),
        dueDateTime: timestamp('due_date_time', { withTimezone: true }),
        reminderDateTime: timestamp('reminder_date_time', { withTimezone: true }),
        importance: text('importance'), // Provider's importance level
        completed: boolean('completed').notNull().default(false),
        // Plannr enrichment fields
        mappedPriority: text('mapped_priority'), // 'LOW'|'MEDIUM'|'HIGH'
        estimatedDurationMinutes: integer('estimated_duration_minutes'),
        isIncluded: boolean('is_included').notNull().default(true),
        enrichmentData: jsonb('enrichment_data'), // Store enrichment overrides/defaults
        warnings: jsonb('warnings'), // Array of warning messages
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    },
    (t) => [
        index('task_drafts_session_idx').on(t.sessionId),
        index('task_drafts_source_idx').on(t.sourceTaskId, t.sourceListId),
    ]
);
