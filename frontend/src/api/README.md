# Frontend API Layer

Modular API layer that replaces the monolithic `utils/authenticatedAPI.js`.

## Directory Structure

```
api/
├── core/
│   ├── apiCore.js          # makeAuthenticatedRequest + error handling
│   └── useApiCore.js       # React hook binding Clerk auth to core
│
├── modules/                # Plain functions (testable without React)
│   ├── users.api.js
│   ├── schedules.api.js    # includes saveScheduleWithDays
│   ├── days.api.js
│   ├── blocks.api.js
│   ├── dependencies.api.js
│   ├── preferences.api.js
│   ├── integrations.api.js
│   ├── textToTasks.api.js
│   └── appState.api.js     # complex orchestration functions
│
├── hooks/                  # React hook wrappers (one per domain)
│   ├── useUsersAPI.js
│   ├── useSchedulesAPI.js
│   ├── useDaysAPI.js
│   ├── useBlocksAPI.js
│   ├── useDependenciesAPI.js
│   ├── usePreferencesAPI.js
│   ├── useIntegrationsAPI.js
│   ├── useTextToTasksAPI.js
│   └── useAppStateAPI.js
│
└── index.js                # Backward-compatible useAuthenticatedAPI() export
```

---

## Usage Patterns

### Option 1 — Backward Compatible (existing code, no changes needed)

```javascript
import { useAuthenticatedAPI } from '../utils/authenticatedAPI';
// or the new path:
import { useAuthenticatedAPI } from '../api';

const { getSchedules, getUserProfile, parseTextToFlexibleEvents } = useAuthenticatedAPI();
```

### Option 2 — Domain Hooks (recommended for new code)

```javascript
import { useSchedulesAPI } from '../api/hooks/useSchedulesAPI';
import { useUsersAPI } from '../api/hooks/useUsersAPI';

const { getSchedules, saveScheduleWithDays } = useSchedulesAPI();
const { getUserProfile, updateAvatar } = useUsersAPI();
```

### Option 3 — Direct Module Import (advanced / non-React contexts)

```javascript
import { useApiCore } from '../api/core/useApiCore';
import { getSchedules } from '../api/modules/schedules.api';

const { makeAuthenticatedRequest } = useApiCore();
const schedules = await getSchedules(makeAuthenticatedRequest);
```

---

## Adding New API Modules (e.g. AI Chat)

1. Create `api/modules/aiChat.api.js`:

    ```javascript
    export const sendMessage = (makeAuthenticatedRequest, message) =>
        makeAuthenticatedRequest('/api/ai-chat/message', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    ```

2. Create `api/hooks/useAIChatAPI.js`:

    ```javascript
    import { useApiCore } from '../core/useApiCore.js';
    import * as aiChatApi from '../modules/aiChat.api.js';

    export const useAIChatAPI = () => {
        const { makeAuthenticatedRequest } = useApiCore();
        return {
            sendMessage: (message) => aiChatApi.sendMessage(makeAuthenticatedRequest, message),
        };
    };
    ```

3. Optionally add to `api/index.js` for backward compatibility.

No changes needed to any existing module.

---

## Module Ownership

| Module                | Functions | Domain                            |
| --------------------- | --------- | --------------------------------- |
| `users.api.js`        | 7         | User profile, auth, onboarding    |
| `schedules.api.js`    | 6         | Schedule CRUD + complex save      |
| `days.api.js`         | 5         | Day CRUD (nested under schedules) |
| `blocks.api.js`       | 5         | Block CRUD + completion           |
| `dependencies.api.js` | 3         | Event dependencies                |
| `preferences.api.js`  | 2         | User preferences                  |
| `integrations.api.js` | 2         | Google Calendar export            |
| `textToTasks.api.js`  | 1         | AI text parsing                   |
| `appState.api.js`     | 3         | Cross-domain orchestration        |
