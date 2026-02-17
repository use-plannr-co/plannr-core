import { Platform } from 'react-native';

/**
 * Get the user's timezone in IANA format (e.g., 'America/Vancouver', 'Europe/London')
 * This is important for Google Calendar integration to ensure events appear at correct times
 */
export const getUserTimezone = () => {
    try {
        // Try JavaScript Intl API first (available in modern React Native)
        if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timezone) {
                return timezone;
            }
        }

        // Platform-specific fallbacks
        if (Platform.OS === 'ios') {
            // iOS specific logic could go here
            return 'America/New_York'; // Default for North America
        } else if (Platform.OS === 'android') {
            // Android specific logic could go here
            return 'America/New_York'; // Default for North America
        }

        // Ultimate fallback
        return 'UTC';
    } catch (error) {
        console.warn('Failed to determine user timezone, falling back to UTC:', error);
        return 'UTC';
    }
};

/**
 * Convert a timezone to a human-readable format
 * @param {string} timezone - IANA timezone string
 * @returns {string} Human readable timezone name
 */
export const getTimezoneDisplayName = (timezone) => {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en', {
            timeZone: timezone,
            timeZoneName: 'long',
        });

        const parts = formatter.formatToParts(now);
        const timeZoneName = parts.find((part) => part.type === 'timeZoneName');

        return timeZoneName ? timeZoneName.value : timezone;
    } catch (error) {
        console.warn('Failed to get timezone display name:', error);
        return timezone;
    }
};

/**
 * Validate if a timezone string is valid
 * @param {string} timezone - IANA timezone string to validate
 * @returns {boolean} True if timezone is valid
 */
export const isValidTimezone = (timezone) => {
    try {
        // Try to create a date formatter with the timezone
        new Intl.DateTimeFormat('en', { timeZone: timezone });
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Get common timezone options for user selection
 * @returns {Array} Array of {value, label} timezone options
 */
export const getCommonTimezones = () => {
    return [
        { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
        { value: 'America/Denver', label: 'Mountain Time (Denver)' },
        { value: 'America/Chicago', label: 'Central Time (Chicago)' },
        { value: 'America/New_York', label: 'Eastern Time (New York)' },
        { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
        { value: 'Europe/London', label: 'GMT (London)' },
        { value: 'Europe/Paris', label: 'Central European Time (Paris)' },
        { value: 'Europe/Berlin', label: 'Central European Time (Berlin)' },
        { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)' },
        { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)' },
        { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)' },
        { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
    ];
};
