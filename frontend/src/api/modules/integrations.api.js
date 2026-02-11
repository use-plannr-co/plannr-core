/**
 * Integrations API module
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

export const checkGoogleCalendarStatus = async (makeAuthenticatedRequest) => {
    const response = await makeAuthenticatedRequest('/api/integrations/google-calendar/status');
    return response.data.connected;
};

export const exportScheduleToGoogleCalendar = async (
    makeAuthenticatedRequest,
    schedule,
    userTimezone = 'UTC',
    accessToken = null,
    scheduleName = null,
    userName = null
) => {
    console.log('🔄 Starting Google Calendar export...');

    if (!schedule || !schedule.getSchedule) {
        throw new Error('Invalid schedule object provided');
    }

    const events = [];
    const scheduleMap = schedule.getSchedule();

    for (const [, daySchedule] of scheduleMap) {
        const timeBlocks = daySchedule.getTimeBlocks();
        if (!timeBlocks || timeBlocks.length === 0) continue;

        for (const timeBlock of timeBlocks) {
            if (timeBlock.type === 'break') continue;
            const event = convertTimeBlockToCalendarEvent(timeBlock, userTimezone);
            if (event) events.push(event);
        }
    }

    if (events.length === 0) {
        throw new Error('No events found in schedule to export');
    }

    console.log(`📅 Exporting ${events.length} events to Google Calendar`);

    const requestBody = { events };
    if (accessToken) requestBody.accessToken = accessToken;
    if (scheduleName) requestBody.scheduleName = scheduleName;
    if (userName) requestBody.userName = userName;

    try {
        const response = await makeAuthenticatedRequest('/api/integrations/google-calendar/export', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        console.log('✅ Successfully exported to Google Calendar:', response.data);
        return response.data;
    } catch (error) {
        if (error.errorCode === 'GOOGLE_ACCOUNT_REAUTH_NEEDED' || error.errorCode === 'GOOGLE_ACCOUNT_NOT_FOUND') {
            const { Alert } = require('react-native');
            Alert.alert(
                'Google Calendar Access Required',
                'Plannr currently does not have access to your Google Calendar. Please sign out and sign in with your Google account again to grant access.',
                [{ text: 'OK', style: 'default' }]
            );
            const authError = new Error('GOOGLE_CALENDAR_AUTH_ERROR');
            authError.originalError = error;
            authError.errorCode = error.errorCode;
            throw authError;
        }
        throw error;
    }
};

/**
 * Convert a TimeBlock to Google Calendar event format.
 * @private
 */
const convertTimeBlockToCalendarEvent = (timeBlock, userTimezone = 'UTC') => {
    try {
        if (!timeBlock || !timeBlock.getName || !timeBlock.getDate || !timeBlock.getStartTime || !timeBlock.getEndTime) {
            console.warn('Invalid timeBlock structure:', timeBlock);
            return null;
        }

        const name = timeBlock.getName();
        const date = timeBlock.getDate();
        const startTime = timeBlock.getStartTime();
        const endTime = timeBlock.getEndTime();

        if (!name || !date || !startTime || !endTime) {
            console.warn('Missing required timeBlock data:', { name, date, startTime, endTime });
            return null;
        }

        const startDateTime = createISODateTime(date, startTime, userTimezone);
        const endDateTime = createISODateTime(date, endTime, userTimezone);

        if (!startDateTime || !endDateTime) {
            console.warn('Failed to create datetime strings for timeBlock:', timeBlock.getName());
            return null;
        }

        const uid = timeBlock.backendId
            ? `plannr-${timeBlock.backendId}`
            : `plannr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        let description = '';
        if (timeBlock.getActivityType && timeBlock.getActivityType()) {
            description += `Activity: ${timeBlock.getActivityType()}\n`;
        }
        if (timeBlock.priority && timeBlock.priority.toString && timeBlock.priority.toString() !== 'NONE') {
            description += `Priority: ${timeBlock.priority.toString()}\n`;
        }
        if (timeBlock.deadline && timeBlock.deadline.getDateString) {
            description += `Deadline: ${timeBlock.deadline.getDateString()}\n`;
        }
        description += '\nCreated by Plannr';

        return {
            uid,
            title: name,
            description: description.trim(),
            start: startDateTime,
            end: endDateTime,
            timeZone: userTimezone
        };
    } catch (error) {
        console.error('Error converting timeBlock to calendar event:', error);
        return null;
    }
};

/**
 * Create ISO datetime string from ScheduleDate and Time24.
 * @private
 */
const createISODateTime = (scheduleDate, time24, timezone) => {
    try {
        if (!scheduleDate || !time24) return null;

        const year = scheduleDate.year || scheduleDate.getYear?.();
        const month = scheduleDate.month || scheduleDate.getMonth?.();
        const day = scheduleDate.date || scheduleDate.getDay?.();

        if (!year || !month || !day) {
            console.warn('Invalid date components:', { year, month, day });
            return null;
        }

        const hour = time24.hour || time24.getHour?.();
        const minute = time24.minute || time24.getMinute?.();

        if (hour === undefined || minute === undefined) {
            console.warn('Invalid time components:', { hour, minute });
            return null;
        }

        const jsDate = new Date(year, month - 1, day, hour, minute, 0, 0);
        return jsDate.toISOString();
    } catch (error) {
        console.error('Error creating ISO datetime:', error);
        return null;
    }
};
