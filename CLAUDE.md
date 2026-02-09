# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plannr is an AI-powered task scheduling and productivity app. It's a monorepo with a React Native/Expo frontend and a Node.js/Express backend, using PostgreSQL (Neon) with Drizzle ORM.

## Commands

### Development
```bash
npm run dev                # Run both frontend and backend concurrently
npm run dev:frontend       # Expo dev server only
npm run dev:backend        # Backend with nodemon only
```

### Mobile
```bash
npm run ios                # Run on iOS simulator
npm run android            # Run on Android emulator
npm run web                # Run in web browser
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

### Install
```bash
npm run install:all        # Install root + frontend + backend deps
```

## Architecture

### Monorepo Layout
- `frontend/` — React Native (Expo 54, React 19, RN 0.81) mobile app
- `backend/` — Express 5 API server (ES modules throughout, `"type": "module"`)
- `docs/` — Project documentation

### Frontend

**Entry point:** `frontend/App.js`

**Provider tree** (outermost to innermost):
ClerkProvider → AppUpdateProvider → SubscriptionProvider → AppStateProvider → SafeAreaProvider → RootNavigator

**Key directories under `frontend/src/`:**
- `context/` — Three React Context providers: `AppStateContext` (global state), `AppUpdateContext` (version enforcement), `SubscriptionContext` (RevenueCat subscriptions)
- `navigation/` — React Navigation stacks: `RootNavigator` → `AuthStack` | `AppStack`, plus `UserProfileStack`
- `screens/` — Screen components (~15 screens)
- `components/` — Reusable UI components including `ProGate.jsx` for subscription gating
- `modals/` — Modal components (~9 modals)
- `model/` — Data model classes (~23 files)
- `services/subscription/` — RevenueCat integration (`SubscriptionService.js`)
- `utils/authenticatedAPI.js` — Main API client for backend communication (large file)
- `design/` — Theme and design system constants
- `persistence/` — AsyncStorage utilities

**Auth:** Clerk (`@clerk/clerk-expo`) with `expo-secure-store` for token caching.

**Subscription/Paywall:** RevenueCat (`react-native-purchases`). Pro features gated via `ProGate` component and `requirePro.js` utility.

### Backend

**Entry point:** `backend/src/server.js`

**Module pattern** — Feature-based modules in `backend/src/modules/`, each containing:
- `<module>.routes.js` — Express router
- `<module>.controllers.js` — Request handlers
- `<module>.repo.js` — Database queries (Drizzle ORM)
- `<module>.validators.js` — Zod validation schemas

**Modules:** `users`, `schedules`, `preferences`, `integrations`, `textToTasks`

**Routes mounted at:** `/api/<module-name>` (see `backend/src/routes/index.js`)

**Middleware stack:** `enforceMinAppVersion` (global), `clerkAuth`/`auth` (per-route), `validate` (Zod), `rateLimiters`, `error` (global error handler)

**Database:** PostgreSQL on Neon (`@neondatabase/serverless`), managed via Drizzle ORM. Schema in `backend/src/db/schema.js`. Key tables: `users`, `schedules`, `days`, `blocks` (time blocks/tasks within days), `dependencies`.

**AI:** Google Gemini API (`@google/generative-ai`) for text-to-tasks and scheduling suggestions.

**Config:** Environment loaded via `dotenv` into `backend/src/config/env.js`. Key env vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `GEMINI_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`.

### Scheduling Domain Model
Schedules contain multiple `days`, each day contains `blocks` (tasks/time blocks). Blocks have start/end times in 24h integer format (e.g., 900 = 9:00 AM). Three scheduling strategies: `earliest-fit`, `balanced-work`, `deadline-oriented`. Dependencies between tasks are tracked in a separate `dependencies` table with a JSON map.
