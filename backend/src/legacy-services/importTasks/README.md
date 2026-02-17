# Microsoft To-Do Import Module

This module provides comprehensive integration with Microsoft To-Do and Calendar services, allowing users to import tasks and generate optimized schedules.

## Features

- **OAuth 2.0 + PKCE Authentication**: Secure authentication flow for both web and mobile clients
- **Task Import**: Import tasks from all Microsoft To-Do lists with filtering options
- **Calendar Integration**: Fetch calendar events for schedule conflict detection
- **Data Normalization**: Convert Microsoft Graph data to standardized format
- **Schedule Generation**: Integrate with existing scheduling algorithms
- **Encrypted Token Storage**: Secure storage of access and refresh tokens
- **Session Management**: Track import progress with expiring sessions

## API Endpoints

### Authentication

- `POST /api/import/auth/microsoft/initiate` - Start OAuth flow
- `GET /api/import/auth/microsoft/callback` - Handle OAuth callback
- `DELETE /api/import/auth/microsoft/disconnect` - Disconnect account

### Import Management

- `GET /api/import/connections` - Get connected providers
- `POST /api/import/start` - Start new import session
- `POST /api/import/sessions/:id/execute` - Execute import
- `GET /api/import/sessions/:id/status` - Get session status
- `GET /api/import/sessions/:id/tasks` - Get imported tasks
- `POST /api/import/sessions/:id/generate-schedule` - Generate schedule

## Environment Variables

Add these to your `.env` file:

```env
# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here  # Optional for public clients
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/import/auth/microsoft/callback

# Encryption Configuration
ENCRYPTION_KEY=base64_encoded_32_byte_key_here
```

### Generating Encryption Key

Run this in Node.js to generate a secure encryption key:

```javascript
import EncryptionService from './src/modules/importTasks/services/encryptionService.js';
console.log('ENCRYPTION_KEY=' + EncryptionService.generateKey());
```

## Microsoft App Registration

1. Go to [Azure Portal](https://portal.azure.com) > App registrations > New registration
2. Set application name (e.g., "Plannr Task Import")
3. Add redirect URI: `http://localhost:3000/api/import/auth/microsoft/callback`
4. Go to "API permissions" > Add permission > Microsoft Graph > Delegated permissions
5. Add these permissions:
    - `Tasks.Read` - Read user's tasks
    - `Calendars.Read` - Read user's calendars
    - `offline_access` - Maintain access to data
6. Grant admin consent if required
7. Go to "Certificates & secrets" > New client secret (optional for confidential clients)
8. Copy the Application (client) ID and client secret

## Database Schema

The module adds three new tables:

- `provider_connections` - Encrypted OAuth tokens and connection metadata
- `import_sessions` - Track import progress and temporary data
- `task_drafts` - Imported tasks before schedule generation

Run migrations:

```bash
cd backend
npm run db:generate
npm run db:push
```

## Usage Example

```javascript
// Start import session
const sessionResponse = await fetch('/api/import/start', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + userToken },
    body: JSON.stringify({
        provider: 'microsoft',
        options: {
            includeCompletedTasks: false,
            dueDateFilter: {
                after: '2024-01-01',
                before: '2024-12-31',
            },
        },
    }),
});

const { session } = await sessionResponse.json();

// Execute import
const importResponse = await fetch(`/api/import/sessions/${session.id}/execute`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + userToken },
});

// Generate schedule
const scheduleResponse = await fetch(`/api/import/sessions/${session.id}/generate-schedule`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + userToken },
    body: JSON.stringify({
        scheduleOptions: {
            startDate: '2024-01-15',
            endDate: '2024-01-31',
            strategy: 'balanced',
            workingHours: { start: 9, end: 17 },
            workingDays: [1, 2, 3, 4, 5], // Mon-Fri
        },
    }),
});
```

## Error Handling

The module provides comprehensive error handling:

- **Authentication Errors**: Token expiration, invalid permissions
- **API Errors**: Rate limiting, server errors with automatic retry
- **Validation Errors**: Invalid request parameters with detailed messages
- **Network Errors**: Connection timeouts and retry logic

## Security Features

- **PKCE Flow**: Prevents authorization code interception
- **Encrypted Storage**: All tokens encrypted at rest using AES-256-GCM
- **Token Refresh**: Automatic token refresh with fallback handling
- **Session Expiry**: Import sessions expire after 24 hours
- **Validation**: All inputs validated and sanitized

## Integration with Existing Scheduler

The module is designed to work with the existing scheduling system:

```javascript
// In scheduleService.js
export async function generateScheduleFromImport(userId, tasks, calendarEvents, options) {
    // Convert imported tasks to existing task format
    const formattedTasks = tasks.map((task) => ({
        title: task.title,
        duration: task.estimatedDuration,
        priority: task.priority,
        dueDate: task.dueDate,
        // ... other properties
    }));

    // Use existing scheduling strategies
    const strategy = getStrategy(options.strategy);
    return strategy.schedule(formattedTasks, calendarEvents, options);
}
```

## Testing

Run the test suite:

```bash
cd backend
npm test -- src/modules/importTasks/tests/
```

Tests cover:

- Encryption service functionality
- Data mapping and transformation
- API endpoint validation
- Error handling scenarios

## Monitoring and Cleanup

- **Session Cleanup**: Expired sessions are automatically cleaned up
- **Token Refresh**: Failed token refreshes are logged for monitoring
- **Rate Limiting**: Microsoft Graph API rate limits are handled gracefully
- **Error Logging**: Comprehensive error logging for debugging
