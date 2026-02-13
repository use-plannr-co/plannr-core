import {
  pgTable, uuid, text, timestamp, boolean, integer, jsonb, date, index, uniqueIndex, real
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarName: text("avatar_name"),
  onboarded: boolean("onboarded").notNull().default(false),
  isPro: boolean("is_pro").notNull().default(false), // Convenience field for quick Pro status checks
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // Support both period-based and day1-based scheduling
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  // Frontend Schedule model fields
  day1Date: jsonb("day1_date"), // Store ScheduleDate as {date: 7, month: 10, year: 2025}
  day1Day: text("day1_day"), // "Monday", "Tuesday", etc.
  isActive: boolean("is_active").notNull().default(false),
  // Additional fields from frontend Schedule model
  numDays: integer("num_days").notNull().default(7),
  minGap: integer("min_gap").notNull().default(15), // minutes
  workingHoursLimit: integer("working_hours_limit").notNull().default(8),
  strategy: text("strategy").notNull().default("earliest-fit"), // 'earliest-fit'|'balanced-work'|'deadline-oriented'
  startTime: integer("start_time").notNull().default(900), // Time24 format (e.g., 900 = 9:00 AM)
  endTime: integer("end_time").notNull().default(1700), // Time24 format (e.g., 1700 = 5:00 PM)
  metadata: jsonb("metadata"),
  version: integer("version").notNull().default(1),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("schedules_owner_active_idx").on(t.ownerId, t.isActive),
  index("schedules_owner_updated_idx").on(t.ownerId, t.updatedAt),
]);

export const dependencies = pgTable("dependencies", {
    id: uuid("id").defaultRandom().primaryKey(),
    scheduleId: uuid("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
    dependenciesMap: jsonb('dependencies_map').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export const days = pgTable("days", {
  id: uuid("id").defaultRandom().primaryKey(),
  scheduleId: uuid("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(), // 1, 2, 3, etc. (relative to schedule start)
  dayName: text("day_name").notNull(), // "Monday", "Tuesday", etc.
  date: date("date").notNull(), // YYYY-MM-DD format for database queries
  dateObject: jsonb("date_object").notNull(), // ScheduleDate as {date: 7, month: 10, year: 2025}
  // Day-level scheduling metadata
  dayStartTime: integer("day_start_time"), // Override schedule default start time for this day
  dayEndTime: integer("day_end_time"), // Override schedule default end time for this day
  isWeekend: boolean("is_weekend").notNull().default(false),
  isHoliday: boolean("is_holiday").notNull().default(false),
  // Day-level preferences and constraints
  maxWorkingHours: integer("max_working_hours"), // Override schedule default for this day
  minGap: integer("min_gap").notNull().default(15), // Minimum gap between events for this day in minutes
  // Metadata for day-level features
  metadata: jsonb("metadata"), // Store day-specific settings, preferences, etc.
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  // Ensure unique day numbers within a schedule
  uniqueIndex("days_schedule_day_number_idx").on(t.scheduleId, t.dayNumber),
  // Ensure unique dates within a schedule (prevent duplicate days)
  uniqueIndex("days_schedule_date_idx").on(t.scheduleId, t.date),
  // Index for efficient day lookups by schedule
  index("days_schedule_updated_idx").on(t.scheduleId, t.updatedAt),
  // Index for date-based queries
  index("days_date_idx").on(t.date),
]);

export const blocks = pgTable("blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayId: uuid("day_id").notNull().references(() => days.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'rigid' | 'flexible' | 'break'
  title: text("title").notNull(), // Maps to 'name' in frontend
  // Time24 format for times
  startAt: integer("start_at").notNull(), // Time24 format (e.g., 930 = 9:30 AM)
  endAt: integer("end_at").notNull(), // Time24 format (e.g., 1030 = 10:30 AM)
  // Support both simple date and ScheduleDate object (kept for backwards compatibility during migration)
  blockDate: date("block_date"), // Simple date for database queries - will be deprecated after migration
  dateObject: jsonb("date_object"), // ScheduleDate as {date: 7, month: 10, year: 2025} - will be moved to days table
  category: text("category"), // ActivityType enum
  // Enhanced metadata for frontend compatibility
  metadata: jsonb("metadata"), // Stores: activityType, priority, deadline, duration, frontendId
  // Direct fields for common properties
  priority: text("priority"), // 'LOW'|'MEDIUM'|'HIGH'
  deadline: date("deadline"), // Simple deadline date
  deadlineObject: jsonb("deadline_object"), // ScheduleDate object for deadline
  duration: integer("duration"), // Duration in minutes
  frontendId: text("frontend_id"), // Store frontend-generated IDs
  completed: boolean("completed").notNull().default(false),
  version: integer("version").notNull().default(1),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("blocks_day_start_idx").on(t.dayId, t.startAt), // Primary index for day-based queries
  index("blocks_day_updated_idx").on(t.dayId, t.updatedAt), // For sorting blocks by update time within a day
  index("blocks_frontend_id_idx").on(t.frontendId),
  // Keep legacy date index temporarily for migration compatibility
  index("blocks_date_start_idx").on(t.blockDate, t.startAt),
]);

export const preferences = pgTable("preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  uiMode: text("ui_mode").notNull().default("light"), // 'light'|'dark'
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  leadMinutes: integer("lead_minutes").notNull().default(10),
  minGapMinutes: integer("min_gap_minutes").notNull().default(15),
  maxWorkHoursPerDay: integer("max_work_hours_per_day").notNull().default(8),
  weekendPolicy: text("weekend_policy").notNull().default("allow"),
  defaultStrategy: text("default_strategy").notNull().default("earliest-fit"), // 'earliest-fit'|'balanced-work'|'deadline-oriented'
  nickname: text("nickname"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Text-to-Tasks sessions
export const textToTasksSessions = pgTable("text_to_tasks_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("parsing"), // 'parsing', 'enriching', 'scheduled', 'failed'
  inputHash: text("input_hash").notNull(), // SHA256 hash of input text
  inputStats: jsonb("input_stats"), // { chars, lines, itemsDetected }
  dateRangeStart: timestamp("date_range_start", { withTimezone: true }),
  dateRangeEnd: timestamp("date_range_end", { withTimezone: true }),
  llmProvider: text("llm_provider"), // 'gemini', 'openai', etc.
  llmModel: text("llm_model"), // 'gemini-1.5-flash', etc.
  llmTokensIn: integer("llm_tokens_in"),
  llmTokensOut: integer("llm_tokens_out"),
  parseLatencyMs: integer("parse_latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index("text_to_tasks_sessions_user_idx").on(table.userId),
  statusIdx: index("text_to_tasks_sessions_status_idx").on(table.status),
  hashIdx: index("text_to_tasks_sessions_hash_idx").on(table.inputHash),
}));

// Text-to-Tasks draft tasks
export const textToTasksDrafts = pgTable("text_to_tasks_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => textToTasksSessions.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  deadline: timestamp("deadline", { withTimezone: true }),
  preferredStart: timestamp("preferred_start", { withTimezone: true }),
  priority: text("priority").notNull().default("MEDIUM"), // 'LOW', 'MEDIUM', 'HIGH'
  durationMinutes: integer("duration_minutes"),
  included: boolean("included").notNull().default(true),
  warnings: jsonb("warnings").default("[]"), // Array of warning objects
  confidence: real("confidence"), // 0.0-1.0 LLM confidence score
  enrichment: jsonb("enrichment"), // User overrides and defaults applied
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionIdx: index("text_to_tasks_drafts_session_idx").on(table.sessionId),
  orderIdx: index("text_to_tasks_drafts_order_idx").on(table.sessionId, table.orderIndex),
}));

// Subscriptions (RevenueCat integration)
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  rcAppUserId: text("rc_app_user_id").notNull(), // RevenueCat App User ID (same as Clerk user ID)
  isPro: boolean("is_pro").notNull().default(false), // Convenience flag - true if any Pro entitlement is active
  entitlementActive: boolean("entitlement_active").notNull().default(false), // Whether 'plannr_pro' entitlement is active
  expirationAt: timestamp("expiration_at", { withTimezone: true }), // When the current subscription expires
  productId: text("product_id"), // RevenueCat product identifier (e.g., 'plannr_pro_monthly')
  store: text("store"), // 'app_store', 'play_store', 'stripe', etc.
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow(), // Last time subscription was synced
  // Additional metadata for debugging and auditing
  metadata: jsonb("metadata"), // Store additional RevenueCat data if needed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index("subscriptions_user_idx").on(table.userId),
  rcAppUserIdx: index("subscriptions_rc_app_user_idx").on(table.rcAppUserId),
  expirationIdx: index("subscriptions_expiration_idx").on(table.expirationAt),
}));

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("chats_user_idx").on(t.userId),
  index("chats_user_updated_idx").on(t.userId, t.updatedAt),
]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  role: text("role").notNull(),              // 'user' | 'assistant'
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),            // Claude tool_use blocks (assistant turns with tool calls)
  toolResults: jsonb("tool_results"),        // tool_result blocks (user turns returning tool output)
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("chat_messages_chat_idx").on(t.chatId),
  index("chat_messages_chat_created_idx").on(t.chatId, t.createdAt),
]);

export const chatDailyUsage = pgTable("chat_daily_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  messageCount: integer("message_count").notNull().default(0),
}, (t) => [
  uniqueIndex("chat_daily_usage_user_date_idx").on(t.userId, t.date),
]);
