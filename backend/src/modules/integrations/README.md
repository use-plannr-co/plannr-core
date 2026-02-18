# Google Calendar Integration

This module provides Google Calendar integration for the Plannr backend, allowing users to export their Plannr events directly to a dedicated Google Calendar.

## Features

- **Automatic Calendar Creation**: Creates a dedicated "Plannr" calendar in the user's Google Calendar
- **OAuth Integration**: Uses Clerk's OAuth integration to securely access Google Calendar API
- **Event Export**: Exports multiple events in a single request
- **Error Handling**: Comprehensive error handling for authentication and API issues
- **Caching**: Caches calendar IDs to reduce API calls

## API Endpoints

### POST /integrations/google-calendar/export

Exports events to the user's Google Calendar.

**Authentication**: Requires Clerk session token in Authorization header

**Request Body**:

```json
{
    "events": [
        {
            "uid": "unique-event-id",
            "title": "Event Title",
            "description": "Optional description",
            "start": "2024-01-15T10:00:00.000Z",
            "end": "2024-01-15T11:00:00.000Z",
            "timeZone": "America/Vancouver"
        }
    ]
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "inserted": 1,
        "calendarId": "google-calendar-id",
        "googleEventIds": [
            {
                "uid": "unique-event-id",
                "eventId": "google-event-id"
            }
        ]
    }
}
```

**Error Responses**:

- `409 GOOGLE_CALENDAR_NOT_CONNECTED`: User hasn't connected Google Calendar or missing required permissions
- `409 GOOGLE_CALENDAR_REAUTH_REQUIRED`: Google access token expired or revoked
- `400`: Validation error
- `401`: Authentication error

### GET /integrations/google-calendar/status

Checks if the user has connected Google Calendar with the required permissions.

**Authentication**: Requires Clerk session token in Authorization header

**Response**:

```json
{
    "success": true,
    "data": {
        "connected": true
    }
}
```

## Required Google OAuth Scope

The integration requires the following OAuth scope:

- `https://www.googleapis.com/auth/calendar.app.created` - Allows creating secondary calendars and managing events on those calendars

## Calendar Management

The integration automatically:

1. Checks if a "Plannr" calendar exists in the user's Google Calendar
2. Creates one if it doesn't exist
3. Caches the calendar ID to avoid repeated API calls
4. Uses the dedicated calendar for all Plannr events

## Event Properties

Each exported event includes:

- **Summary**: Event title
- **Description**: Event description
- **Start/End Times**: With timezone support
- **Source**: Links back to Plannr app with `plannr://event/<uid>` URL
- **Extended Properties**: Stores the original Plannr event UID for reference

## Testing

Use the provided test script to verify the integration:

```bash
node test-integrations-api.js
```

**Note**: Update the `TEST_SESSION_TOKEN` in the test file with a valid Clerk session token before running tests.

## Error Handling

The integration handles various error scenarios:

1. **Missing OAuth Token**: Returns `GOOGLE_CALENDAR_NOT_CONNECTED`
2. **Invalid Scope**: Returns `GOOGLE_CALENDAR_NOT_CONNECTED`
3. **Expired Token**: Returns `GOOGLE_CALENDAR_REAUTH_REQUIRED`
4. **API Rate Limits**: Continues with other events if one fails
5. **Validation Errors**: Returns detailed validation error messages

## Security Considerations

- OAuth access tokens are never exposed to the client
- All Google API calls are made server-side
- Tokens are retrieved securely through Clerk's backend SDK
- Event data is validated before processing

## Dependencies

- `@clerk/backend`: For OAuth token retrieval
- `axios`: For Google Calendar API requests
- `zod`: For request validation

## File Structure

```
integrations/
├── integrations.routes.js      # Express routes definition
├── integrations.controllers.js # Request handlers and business logic
├── integrations.validators.js  # Request validation schemas
└── integrations.repo.js       # Data access layer (caching)
```
