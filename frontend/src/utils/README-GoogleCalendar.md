# Google Calendar Integration - Frontend

This implementation provides Google Calendar export functionality for the Plannr React Native frontend.

## Overview

The Google Calendar integration allows users to export their Plannr schedules directly to a dedicated "Plannr" calendar in their Google Calendar account. The integration handles:

- Converting Plannr Schedule objects to Google Calendar events
- Timezone handling for accurate event times
- Authentication through existing Clerk session
- Error handling for various failure scenarios

## Implementation

### Core Functions

The integration adds two main functions to the `useAuthenticatedAPI` hook:

#### `checkGoogleCalendarStatus()`

Checks if the user has connected Google Calendar with required permissions.

```javascript
const { checkGoogleCalendarStatus } = useAuthenticatedAPI();

const isConnected = await checkGoogleCalendarStatus();
// Returns: boolean - true if connected, false otherwise
```

#### `exportScheduleToGoogleCalendar(schedule, userTimezone)`

Exports a Plannr Schedule object to Google Calendar.

```javascript
const { exportScheduleToGoogleCalendar } = useAuthenticatedAPI();

const result = await exportScheduleToGoogleCalendar(schedule, 'America/Vancouver');
// Returns: { inserted: number, calendarId: string, googleEventIds: Array }
```

**Parameters:**

- `schedule` (Schedule): Plannr Schedule object containing time blocks
- `userTimezone` (string): IANA timezone string (e.g., 'America/Vancouver')

### Data Conversion

The integration converts Plannr data structures to Google Calendar format:

#### TimeBlock → Google Calendar Event

- **Name** → Event title
- **Description** → Built from activity type, priority, deadline
- **Date + StartTime** → Start datetime (ISO format)
- **Date + EndTime** → End datetime (ISO format)
- **BackendId** → Unique event ID (with 'plannr-' prefix)

#### Timezone Handling

Events are converted to ISO datetime strings with proper timezone information to ensure they appear at the correct time in Google Calendar.

### Error Handling

The integration handles common error scenarios:

- **GOOGLE_CALENDAR_NOT_CONNECTED**: User needs to connect Google account
- **GOOGLE_CALENDAR_REAUTH_REQUIRED**: Access token expired, re-auth needed
- **No events found**: Schedule is empty or contains only breaks
- **Invalid schedule**: Schedule object is malformed
- **Network errors**: Connection issues with backend API

## Usage Examples

### Basic Export

```javascript
import { useAuthenticatedAPI } from '../utils/authenticatedAPI';
import { getUserTimezone } from '../utils/timezoneUtils';

const MyComponent = () => {
    const { exportScheduleToGoogleCalendar } = useAuthenticatedAPI();

    const handleExport = async (schedule) => {
        try {
            const userTimezone = getUserTimezone();
            const result = await exportScheduleToGoogleCalendar(schedule, userTimezone);

            alert(`Successfully exported ${result.inserted} events!`);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export to Google Calendar');
        }
    };

    return <Button title="Export to Google Calendar" onPress={() => handleExport(mySchedule)} />;
};
```

### Complete Integration with Error Handling

See `GoogleCalendarExportExample.js` for a complete React Native component that demonstrates:

- Connection status checking
- Export with proper error handling
- User-friendly error messages
- Loading states

### Using Timezone Utilities

```javascript
import {
    getUserTimezone,
    getTimezoneDisplayName,
    getCommonTimezones,
} from '../utils/timezoneUtils';

// Get user's current timezone
const timezone = getUserTimezone(); // e.g., 'America/Vancouver'

// Get human-readable timezone name
const displayName = getTimezoneDisplayName(timezone); // e.g., 'Pacific Standard Time'

// Get list of common timezones for user selection
const timezones = getCommonTimezones(); // Array of {value, label} objects
```

## Event Filtering

The integration currently:

- **Exports**: Flexible events, rigid events, and other scheduled time blocks
- **Skips**: Break time blocks (type === 'break')
- **Includes**: Activity type, priority, deadline in event description

You can modify the filtering logic in `convertTimeBlockToCalendarEvent()` if different behavior is desired.

## File Structure

```
frontend/src/utils/
├── authenticatedAPI.js           # Main API hook with Google Calendar functions
├── GoogleCalendarExportExample.js # Complete usage example component
├── timezoneUtils.js              # Timezone detection and handling utilities
└── README-GoogleCalendar.md      # This documentation
```

## Dependencies

The integration uses existing dependencies:

- `@clerk/clerk-expo` - For authentication
- React Native core APIs - For platform detection and networking
- Existing Plannr models - Schedule, TimeBlock, ScheduleDate, Time24

No additional dependencies are required.

## Integration Points

### Backend API

The frontend communicates with these backend endpoints:

- `GET /api/integrations/google-calendar/status` - Check connection status
- `POST /api/integrations/google-calendar/export` - Export events

### Clerk Authentication

The integration uses the existing Clerk session token for authentication. The user must have connected their Google account through Clerk with the required Calendar scope.

### Plannr Models

The integration works with standard Plannr data models:

- `Schedule` - Main schedule container
- `TimeBlock` - Individual scheduled items
- `ScheduleDate` - Date representation
- `Time24` - Time representation

## Customization

### Event Description Format

Modify `convertTimeBlockToCalendarEvent()` to customize how event descriptions are built from TimeBlock data.

### Filtering Logic

Modify the filtering logic in `exportScheduleToGoogleCalendar()` to change which time blocks are exported.

### Error Messages

Update error handling in the example component to customize user-facing error messages.

### Timezone Defaults

Modify `getUserTimezone()` to change default timezone behavior for your user base.

## Testing

To test the integration:

1. Ensure backend is running with the Google Calendar integration
2. User must have connected Google Calendar through Clerk OAuth
3. User must have granted Calendar events scope
4. Create a test schedule with various time blocks
5. Use the example component to test export functionality

## Security Notes

- OAuth tokens are handled entirely by the backend - never exposed to frontend
- All Google API calls are made server-side through the authenticated backend
- Frontend only sends event data structure, not authentication credentials
- Timezone information helps ensure data accuracy without compromising security
