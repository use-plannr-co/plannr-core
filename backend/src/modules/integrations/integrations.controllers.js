import * as repo from './integrations.repo.js';
import { clerkClient } from '../../config/clerk.js';
import axios from 'axios';

/**
 * Integration Controllers
 * Handles integration-related HTTP requests
 */

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';

/**
 * Get Google OAuth access token from Clerk
 * @param {string} userId - Clerk user ID
 * @returns {Promise<string>} Access token
 * @throws {Error} If token is not available or missing required scope
 */
const getGoogleAccessToken = async (userId) => {
    try {
        console.log('🔍 [DEBUG] Starting OAuth token fetch for userId:', userId);

        // First try to get the user to make sure they exist
        try {
            const user = await clerkClient.users.getUser(userId);
            console.log('🔍 [DEBUG] User found:', !!user);
            console.log('🔍 [DEBUG] User external accounts:', user.externalAccounts?.length || 0);

            // Log external accounts for debugging
            if (user.externalAccounts && user.externalAccounts.length > 0) {
                user.externalAccounts.forEach((account, index) => {
                    console.log(`🔍 [DEBUG] External account ${index}:`, {
                        provider: account.provider,
                        approved_scopes: account.approvedScopes,
                        email: account.emailAddress,
                    });
                });

                // Check if user has Google OAuth connected
                const googleAccount = user.externalAccounts.find(
                    (account) => account.provider === 'oauth_google'
                );

                if (!googleAccount) {
                    console.log('❌ [DEBUG] No Google OAuth account found');
                    throw new Error('GOOGLE_CALENDAR_NOT_CONNECTED');
                }

                console.log('✅ [DEBUG] Google OAuth account found');

                // Check if user has approved the required calendar scope
                if (!googleAccount.approvedScopes) {
                    console.log(
                        '⚠️ [DEBUG] Google OAuth connected but scopes not accessible via backend SDK'
                    );
                    console.log(
                        '💡 [DEBUG] This means OAuth tokens need to be refreshed or accessed differently'
                    );

                    // Return a special error that indicates connection exists but needs refresh
                    throw new Error('GOOGLE_CALENDAR_NEEDS_REAUTH');
                } else {
                    console.log(
                        '🔍 [DEBUG] Google OAuth approved scopes:',
                        googleAccount.approvedScopes
                    );

                    // Check if the required scope is approved
                    if (googleAccount.approvedScopes.includes(REQUIRED_SCOPE)) {
                        console.log(
                            '✅ [DEBUG] Required calendar scope is approved, but backend SDK cannot access tokens'
                        );
                        console.log(
                            '💡 [DEBUG] This is a known limitation - frontend should handle the token access'
                        );

                        // Since the user has approved the scope but backend can't access tokens,
                        // we'll need to get the token from the frontend instead
                        // throw new Error('GOOGLE_CALENDAR_USE_FRONTEND_TOKEN');
                    } else {
                        console.log('❌ [DEBUG] Required calendar scope not approved');
                        throw new Error('GOOGLE_CALENDAR_NEEDS_REAUTH');
                    }
                }
            }
        } catch (userError) {
            console.log('❌ [DEBUG] User error during token fetch:', userError.message);
            if (userError.message === 'GOOGLE_CALENDAR_NEEDS_REAUTH') {
                throw userError; // Preserve the NEEDS_REAUTH error
            }
            if (userError.message === 'GOOGLE_CALENDAR_USE_FRONTEND_TOKEN') {
                throw userError; // Preserve the USE_FRONTEND_TOKEN error
            }
            throw new Error('GOOGLE_CALENDAR_NOT_CONNECTED');
        }

        const oauthTokens = await clerkClient.users.getUserOauthAccessToken(userId, 'google');

        console.log('🔍 [DEBUG] OAuth tokens retrieved:', !!oauthTokens);
        console.log('🔍 [DEBUG] OAuth tokens length:', oauthTokens?.data?.length || 0);

        if (!oauthTokens || oauthTokens.data.length === 0) {
            console.log('❌ [DEBUG] No OAuth tokens found');
            throw new Error('GOOGLE_CALENDAR_NEEDS_REAUTH');
        }

        const tokenData = oauthTokens.data[0];

        console.log('🔍 [DEBUG] Token data exists:', !!tokenData);

        if (!tokenData) {
            console.log('❌ [DEBUG] Token data is null/undefined');
            throw new Error('GOOGLE_CALENDAR_NEEDS_REAUTH');
        }

        console.log('🔍 [DEBUG] Token scopes:', tokenData.scopes);
        console.log('🔍 [DEBUG] Required scope:', REQUIRED_SCOPE);
        console.log(
            '🔍 [DEBUG] Scopes includes required:',
            tokenData.scopes?.includes(REQUIRED_SCOPE)
        );

        // Check if the required scope is present
        if (!tokenData.scopes || !tokenData.scopes.includes(REQUIRED_SCOPE)) {
            console.log('❌ [DEBUG] Required scope not found in token scopes');
            throw new Error('GOOGLE_CALENDAR_NOT_CONNECTED');
        }

        console.log('✅ [DEBUG] Token validation successful');
        return tokenData.token;
    } catch (error) {
        if (
            error.message === 'GOOGLE_CALENDAR_NOT_CONNECTED' ||
            error.message === 'GOOGLE_CALENDAR_NEEDS_REAUTH' ||
            error.message === 'GOOGLE_CALENDAR_USE_FRONTEND_TOKEN'
        ) {
            throw error;
        }
        console.error('Error fetching Google OAuth token:', error);
        throw new Error('GOOGLE_CALENDAR_NEEDS_REAUTH');
    }
};

/**
 * Find or create the Plannr calendar
 * @param {string} accessToken - Google OAuth access token
 * @param {string} timeZone - User's timezone
 * @param {string} calendarName - Custom calendar name (optional, defaults to 'Plannr')
 * @returns {Promise<string>} Calendar ID
 */
const findOrCreatePlannrCalendar = async (
    accessToken,
    timeZone = 'UTC',
    calendarName = 'Plannr'
) => {
    try {
        // First, check if calendar with this name already exists
        const calendarListResponse = await axios.get(
            `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Look for existing calendar with the specified name
        const plannrCalendar = calendarListResponse.data.items?.find(
            (calendar) => calendar.summary === calendarName
        );

        if (plannrCalendar) {
            return plannrCalendar.id;
        }

        // Create new calendar if not found
        const createCalendarResponse = await axios.post(
            `${GOOGLE_CALENDAR_API_BASE}/calendars`,
            {
                summary: calendarName,
                timeZone: timeZone,
                description: 'Events added by Plannr',
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return createCalendarResponse.data.id;
    } catch (error) {
        console.error(
            'Error finding/creating Plannr calendar:',
            error.response?.data || error.message
        );
        if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error('GOOGLE_CALENDAR_REAUTH_REQUIRED');
        }
        throw new Error('Failed to setup Plannr calendar');
    }
};

/**
 * Insert event into Google Calendar
 * @param {string} accessToken - Google OAuth access token
 * @param {string} calendarId - Google Calendar ID
 * @param {Object} event - Event data
 * @returns {Promise<string>} Google event ID
 */
const insertGoogleCalendarEvent = async (accessToken, calendarId, event) => {
    try {
        const eventData = {
            summary: event.title,
            description: event.description || '',
            start: {
                dateTime: event.start,
                ...(event.timeZone && { timeZone: event.timeZone }),
            },
            end: {
                dateTime: event.end,
                ...(event.timeZone && { timeZone: event.timeZone }),
            },
            // Note: Google Calendar doesn't accept custom URL schemes like plannr://
            // So we'll use the extendedProperties to store our app-specific data
            extendedProperties: {
                private: {
                    plannrUid: event.uid,
                    plannrSource: 'plannr-app',
                },
            },
        };

        const response = await axios.post(
            `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
            eventData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.id;
    } catch (error) {
        console.error(
            'Error inserting Google Calendar event:',
            error.response?.data || error.message
        );
        if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error('GOOGLE_CALENDAR_REAUTH_REQUIRED');
        }
        throw new Error(`Failed to insert event: ${event.title}`);
    }
};

/**
 * Export events to Google Calendar
 */
export const exportToGoogleCalendar = async (req, res, next) => {
    try {
        const { events, accessToken, scheduleName, userName } = req.validatedData;
        const userId = req.headers['x-clerk-user-id'];

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        console.log('🔍 [DEBUG] Export request received:', {
            userId,
            eventCount: events?.length || 0,
            hasAccessToken: !!accessToken,
            scheduleName,
            userName,
        });

        // Create calendar name using the same format as Apple Calendar export
        // Format: "[User Name]: [Schedule Name] - Plannr"
        let calendarName = 'Plannr'; // Default fallback
        if (userName && scheduleName) {
            calendarName = `${userName}: ${scheduleName} - Plannr`;
        } else if (scheduleName) {
            calendarName = `${scheduleName} - Plannr`;
        } else if (userName) {
            calendarName = `${userName} - Plannr`;
        }

        console.log('🔍 [DEBUG] Calendar name will be:', calendarName);

        // Get Google access token - simplified approach
        let googleAccessToken;

        console.log('🔍 [DEBUG] Attempting to get Google OAuth access token...');

        try {
            googleAccessToken = await getGoogleAccessToken(userId);
            console.log('✅ [DEBUG] Successfully got OAuth access token');
        } catch (error) {
            console.log('❌ [DEBUG] Failed to get OAuth access token:', error.message);

            if (error.message === 'GOOGLE_CALENDAR_NOT_CONNECTED') {
                return res.status(409).json({
                    success: false,
                    error: 'GOOGLE_CALENDAR_NOT_CONNECTED',
                    message: 'Google Calendar is not connected or missing required permissions',
                });
            } else if (error.message === 'GOOGLE_CALENDAR_NEEDS_REAUTH') {
                return res.status(409).json({
                    success: false,
                    error: 'GOOGLE_CALENDAR_NEEDS_REAUTH',
                    message:
                        'Google Calendar connection needs re-authentication. Please grant calendar permissions again.',
                });
            } else if (error.message === 'GOOGLE_CALENDAR_USE_FRONTEND_TOKEN') {
                return res.status(409).json({
                    success: false,
                    error: 'GOOGLE_CALENDAR_USE_FRONTEND_TOKEN',
                    message:
                        'Google Calendar is connected but backend cannot access tokens. Please use frontend token.',
                });
            }
            throw error;
        }

        // Check cache for calendar ID first (using the calendar name as key)
        let calendarId = await repo.getCachedGoogleCalendarId(userId, calendarName);

        if (!calendarId) {
            // Determine timezone from first event or default to UTC
            const timeZone = events[0]?.timeZone || 'UTC';

            // Find or create calendar with custom name
            calendarId = await findOrCreatePlannrCalendar(
                googleAccessToken,
                timeZone,
                calendarName
            );

            // Cache the calendar ID with the calendar name
            await repo.cacheGoogleCalendarId(userId, calendarId, calendarName);
        }

        // Insert all events
        const insertResults = [];
        let insertedCount = 0;

        for (const event of events) {
            try {
                const googleEventId = await insertGoogleCalendarEvent(
                    googleAccessToken,
                    calendarId,
                    event
                );
                insertResults.push({
                    uid: event.uid,
                    eventId: googleEventId,
                });
                insertedCount++;
            } catch (error) {
                console.error(`Failed to insert event ${event.uid}:`, error.message);
                // Continue with other events even if one fails
            }
        }

        res.status(200).json({
            success: true,
            data: {
                inserted: insertedCount,
                calendarId: calendarId,
                googleEventIds: insertResults,
            },
        });
    } catch (error) {
        console.error('Google Calendar export error:', error);

        // Handle specific authentication errors
        if (error.message === 'GOOGLE_CALENDAR_NOT_CONNECTED') {
            return res.status(409).json({
                success: false,
                error: 'GOOGLE_ACCOUNT_NOT_FOUND',
                message: 'Google account not found for your Clerk user account',
            });
        }

        if (error.message === 'GOOGLE_CALENDAR_NEEDS_REAUTH') {
            return res.status(409).json({
                success: false,
                error: 'GOOGLE_ACCOUNT_REAUTH_NEEDED',
                message: 'Google Calendar requires re-authentication to access required scopes',
            });
        }

        if (error.message === 'GOOGLE_CALENDAR_REAUTH_REQUIRED') {
            return res.status(409).json({
                success: false,
                error: 'GOOGLE_ACCOUNT_REAUTH_NEEDED',
                message: 'Google Calendar requires re-authentication',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to export events to Google Calendar',
        });
    }
};

/**
 * Get Google Calendar connection status
 */
export const getGoogleCalendarStatus = async (req, res, next) => {
    try {
        const userId = req.headers['x-clerk-user-id'];

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        // Attempt to get Google access token
        try {
            await getGoogleAccessToken(userId);

            res.status(200).json({
                success: true,
                data: {
                    connected: true,
                },
            });
        } catch (error) {
            let responseData = { connected: false };

            if (error.message === 'GOOGLE_CALENDAR_NEEDS_REAUTH') {
                responseData.needsReauth = true;
                responseData.message =
                    'Google Calendar is connected but needs re-authentication to access tokens';
            } else {
                responseData.needsReauth = false;
                responseData.message = 'Google Calendar not connected';
            }

            res.status(200).json({
                success: true,
                data: responseData,
            });
        }
    } catch (error) {
        console.error('Google Calendar status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check Google Calendar status',
        });
    }
};
