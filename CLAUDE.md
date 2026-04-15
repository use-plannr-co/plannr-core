# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plannr is an AI-powered task scheduling and productivity app. It's a monorepo with a React Native/Expo frontend and a Node.js/Express backend, using PostgreSQL (Neon) with Drizzle ORM.

## Commands

### Development
```bash
npm run dev                # Run both frontend and backend concurrently
npm run dev:frontend       # Expo dev server only (with tunnel)
npm run dev:backend        # Backend with nodemon only
```

### Mobile
```bash
npm run ios                # Run on iOS simulator
npm run android            # Run on Android emulator
npm run web                # Run in web browser
```

### Build & Submit
```bash
npm run build:dev          # Expo prebuild for iOS (dev)
npm run build:prod         # EAS production build for iOS
npm run submit             # EAS submit to App Store
npm run bump-version       # Run version bump script
```

### Database (run from `backend/`)
```bash
npm run db:generate        # Generate Drizzle schema artifacts
npm run db:push            # Push schema changes to database
npm run db:migrate         # Run migration files
```

### Testing (run from `backend/`)
```bash
npm test                   # Run backend tests (supertest-based)
```
Backend tests are in `backend/test/`. No frontend test runner is configured yet.

### Code Quality
```bash
npm run lint               # Lint frontend + backend
npm run format             # Format frontend + backend (Prettier)
npm run format:check       # Check formatting without writing
npm run clean              # Remove node_modules and .expo artifacts
```

### Install
```bash
npm run install:all        # Install root + frontend + backend deps
```

## Architecture

### Monorepo Layout
- `frontend/` — React Native (Expo 54, React 19, RN 0.81.4) mobile app
- `backend/` — Express 5 API server (ES modules throughout, `"type": "module"`)
- `docs/` — Project documentation
- `scripts/` — Utility scripts (e.g. `bump-version.js`)

### Frontend

**Entry point:** `frontend/App.js`

**Provider tree** (outermost to innermost):
ClerkProvider → AppUpdateProvider → SubscriptionProvider → AppStateProvider → SafeAreaProvider → RootNavigator

**Key directories under `frontend/src/`:**
- `context/` — Four React Context providers:
  - `AppStateContext.js` — Global app state (active schedule, blocks, etc.)
  - `AppUpdateContext.js` — Version enforcement / force-update logic
  - `SubscriptionContext.js` — RevenueCat subscription status
  - `ChatContext.js` — Chat session state and messaging
- `navigation/` — React Navigation stacks:
  - `RootNavigator.jsx` — Top-level navigator
  - `AuthStack.jsx` — Unauthenticated flow
  - `OnboardingStack.jsx` — New user onboarding flow
  - `AppStack.jsx` — Main authenticated app
  - `UserProfileStack.jsx` — User profile sub-stack
- `screens/` — 12 screen components:
  - `HomeScreen.jsx`, `TodaysTasksScreen.jsx`, `ScheduleViewScreen.jsx`
  - `GenerateScheduleScreen.jsx`, `SavedSchedulesScreen.jsx`
  - `ChatScreen.jsx`, `ProductivityAnalyticsScreen.jsx`
  - `ProPaywallScreen.jsx`, `UserProfileScreen.jsx`, `ManageAccountScreen.jsx`
  - `OnboardingScreen.jsx`, `LoadingScreen.jsx`
- `components/` — 13 reusable UI components + `chat/` subdirectory:
  - `ProGate.jsx` — Pro feature subscription gate
  - `NavigationBar.jsx`, `MenuButton.jsx`, `Progress.jsx`
  - `CollapsibleTaskCard.jsx`, `CollapsibleTimeBlockCard.jsx`
  - `ScheduleCalendarView.jsx`, `UpcomingTasks.jsx`, `TimeOfDay.jsx`
  - `AvatarPickerBottomSheet.jsx`, `ExportCalendarBottomSheet.jsx`, `ComingSoonBottomSheet.jsx`
  - `Checkbox.jsx`
  - `chat/` — `ChatBubble.jsx`, `ChatInput.jsx`, `ChatHeader.jsx`, `ChatDrawer.jsx`, `ChatActionButtons.jsx`, `ChatProcessingBlock.jsx`, `ChatTypingIndicator.jsx`, `FABChatButton.jsx`
- `modals/` — 8 modal components:
  - `EventInfoModal.jsx`, `GenerationModal.jsx`, `AddBusyTimeModal.jsx`
  - `DeleteScheduleModal.jsx`, `AbandonSchedulingModal.jsx`
  - `DailyLimitModal.jsx`, `SchedulingErrorModal.jsx`, `VerificationModal.jsx`
- `hooks/` — 3 custom hooks:
  - `useScheduleActions.js` — Wraps Rescheduler + blocks API persistence; executes chat action proposals
  - `useActionLogger.js` — Action logging
  - `useSubscription.js` — Subscription status convenience hook
- `model/` — Domain model classes (~23 files):
  - Core: `Schedule.js`, `Day.js`, `TimeBlock.js`, `Event.js`, `RigidEvent.js`, `FlexibleEvent.js`, `Break.js`
  - Types: `ScheduleDate.js`, `Time24.js`, `Priority.js`, `ActivityType.js`, `ActivityTypeIcons.js`
  - Scheduling: `Scheduler.js`, `Rescheduler.js`, `SchedulingStrategy.js`, `EarliestFitStrategy.js`, `BalancedWorkStrategy.js`, `DeadlineOrientedStrategy.js`
  - Other: `EventDependencies.js`, `exceptions/`, `test/`
- `services/subscription/` — RevenueCat integration (`SubscriptionService.js`)
- `utils/authenticatedAPI.js` — Main API client for backend communication (large file)
- `design/` — Theme and design system constants
- `persistence/` — AsyncStorage utilities

**Auth:** Clerk (`@clerk/clerk-expo`) with `expo-secure-store` for token caching.

**Subscription/Paywall:** RevenueCat (`react-native-purchases`). Pro features gated via `ProGate` component and `requirePro.js` utility.

**Key UI libraries:** `react-native-gifted-charts` (analytics charts), `lottie-react-native` (animations), `lucide-react-native` (icons), `react-native-reanimated` (animations), `expo-notifications` (push notifications), `expo-speech-recognition` (voice input).

### Backend

**Entry point:** `backend/src/server.js`

**Module pattern** — Feature-based modules in `backend/src/modules/`, each containing:
- `<module>.routes.js` — Express router
- `<module>.controllers.js` — Request handlers
- `<module>.repo.js` — Database queries (Drizzle ORM)
- `<module>.validators.js` — Zod validation schemas

**Modules (8 total):**
- `users` — User creation, lookup, onboarding
- `schedules` — Schedule CRUD, days, blocks
- `preferences` — User scheduling preferences
- `integrations` — Third-party calendar integrations
- `textToTasks` — LLM-powered text-to-tasks parsing (sessions + drafts)
- `chat` — AI chat conversations, messages, daily usage limits
- `analytics` — Computed productivity analytics + daily mood check-ins
- `subscriptions` — RevenueCat webhook handling, subscription state

**Routes mounted at:** `/api/<module-name>` (see `backend/src/routes/index.js`)

**Middleware stack:** `enforceMinAppVersion` (global), `clerkAuth`/`auth` (per-route), `validate` (Zod), `rateLimiters`, `error` (global error handler)

**AI Services** (`backend/src/services/`):
- `llm/` — LLM abstraction layer (`index.js`, `geminiClient.js`) using Google Gemini
- `grok/` — Grok/OpenAI client (`grokClient.js`, `systemPrompt.js`, `toolDefinitions.js`, `toolExecutors.js`) — used for chat

**Database:** PostgreSQL on Neon (`@neondatabase/serverless`), managed via Drizzle ORM. Schema in `backend/src/db/schema.js`.

**Tables:**
- `users` — Clerk-linked accounts (clerkUserId, email, displayName, avatarName, onboarded, isPro)
- `schedules` — Schedule definitions (ownerId, title, numDays, strategy, workingHoursLimit, metadata, version)
- `days` — Days within a schedule (scheduleId, dayNumber, dayName, date, working hours, metadata)
- `blocks` — Time blocks/tasks on days (dayId, type, title, times, category, priority, deadline, duration, completed, metadata)
- `dependencies` — Task dependency maps per schedule (scheduleId, dependenciesMap JSON)
- `preferences` — Per-user scheduling preferences (uiMode, notifications, minGapMinutes, maxWorkHoursPerDay, weekendPolicy, defaultStrategy)
- `textToTasksSessions` — T2T parsing sessions (userId, status, inputHash, llmProvider, tokens, latency)
- `textToTasksDrafts` — Draft tasks from T2T (sessionId, title, deadline, priority, duration, included, confidence)
- `subscriptions` — RevenueCat data (userId, rcAppUserId, isPro, entitlementActive, expirationAt, productId, store)
- `chats` — Chat conversations (userId, title)
- `chatMessages` — Messages (chatId, role, content, toolCalls, toolResults, tokens)
- `chatDailyUsage` — Daily message count per user (userId, date, messageCount)
- `userAnalytics` — Computed analytics cache (userId, data, computedAt)
- `dailyMoodCheckins` — Mood ratings (userId, date, rating)

**Config:** Environment loaded via `dotenv` into `backend/src/config/env.js`. Key env vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `GEMINI_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `OPENAI_API_KEY` (Grok).

**Other backend directories:**
- `backend/src/config/` — `clerk.js`, `cron.js`, `db.js`, `env.js`, `versionPolicy.js`
- `backend/src/middleware/` — `auth.js`, `clerkAuth.js`, `enforceMinAppVersion.js`, `error.js`, `rateLimiters.js`, `validate.js`
- `backend/src/utils/` — `versionUtils.js`, `versionTests.js`

### Scheduling Domain Model
Schedules contain multiple `days`, each day contains `blocks` (tasks/time blocks). Blocks have start/end times in 24h integer format (e.g., 900 = 9:00 AM). Three scheduling strategies: `earliest-fit`, `balanced-work`, `deadline-oriented`. Dependencies between tasks are tracked in a separate `dependencies` table with a JSON map.

The scheduling engine (`Scheduler.js`, `Rescheduler.js`, strategy classes) runs **client-side** on the frontend. The backend stores and retrieves the resulting schedule data but does not run scheduling logic itself.

### Chat Architecture
- Chat module (`backend/src/modules/chat/`) + Grok service (`backend/src/services/grok/`)
- Read-only tools: `get_active_schedule`, `get_todays_tasks`, `get_completed_tasks`, `get_incomplete_tasks`, `get_overdue_tasks`, `get_upcoming_tasks`, `get_schedule_for_date`
- Write tools use a **proposal pattern**: tool emits `action_proposal` SSE event → frontend renders confirm/reject buttons → user confirms → `useScheduleActions.executeAction()` → `POST /api/chat/chats/:chatId/action-result` streams Claude confirmation
- Write tools: `propose_missed_task_shift`, `propose_add_task`, `propose_strategy_switch`
- `submitActionResult` does NOT increment daily usage
- SSE streaming: `writeSSE(res, eventType, data)` helper in controllers

### Analytics Architecture
- Backend module: `backend/src/modules/analytics/`
- Lazy cache pattern: `getOrComputeAnalytics(userId)` checks `computedAt` vs today UTC, recomputes if stale
- Analytics query: blocks JOIN days JOIN schedules WHERE owner_id = userId AND deleted_at IS NULL AND type != 'break' AND date >= 90 days ago
- Time24 helper: `time24ToMinutes(t) = Math.floor(t/100)*60 + (t%100)` — use whenever converting Time24 to minutes
- Frontend: `useAnalyticsAPI` hook, `ProductivityAnalyticsScreen.jsx` (ProGate gated), navigated from SchedulingCenterScreen
- Chart lib: `react-native-gifted-charts` (LineChart, BarChart)
