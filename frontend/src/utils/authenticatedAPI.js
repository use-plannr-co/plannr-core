import { useAuth, useUser } from '@clerk/clerk-expo';
import { 
    serializeSchedule, 
    parseSchedule, 
    convertEventDependenciesToNameMap 
} from '../persistence/ScheduleHandler';
import { serializeTimeBlock, parseTimeBlock } from '../persistence/TimeBlockHandler';
import { serializeScheduleDate } from '../persistence/ScheduleDateHandler';
import ScheduleDate from '../model/ScheduleDate';
import FlexibleEvent from '../model/FlexibleEvent.js';
import { apiClient } from './apiClient';

// Global update handler - will be set by the context
let globalUpdateHandler = null;

export const setGlobalUpdateHandler = (handler) => {
    globalUpdateHandler = handler;
};

/**
 * API utility for making authenticated requests to your backend
 * Use this to call your backend APIs with Clerk authentication
 */
export const useAuthenticatedAPI = () => {
    const { getToken, userId } = useAuth();
    const { user } = useUser();

    const makeAuthenticatedRequest = async (endpoint, options = {}) => {
        try {
            // Get the current session token from Clerk
            const token = await getToken();
            // console.log('🔍 Retrieved token for key:', token ? 'PRESENT' : 'NULL');
            // if (token) {
            //     console.log('🔍 Token preview:', token.substring(0, 20) + '...');
            // }
            
            let authToken = token;
            
            // Only allow development auth in development environment
            if (!token) {
                if (__DEV__) {
                    // Use development token for testing when no Clerk token available (DEV ONLY)
                    console.log('🔧 No Clerk token available, using development auth');
                    authToken = 'dev:frontend-user-123:frontend-dev@plannr.app';
                } else {
                    // In production, require valid authentication
                    throw new Error('Authentication required. Please sign in to continue.');
                }
            }

            // Make the API request with the token using our enhanced API client
            const response = await apiClient.makeRequest(endpoint, {
                ...options,
                headers: {
                    'x-clerk-user-id': userId || (__DEV__ ? 'dev-user-id' : null), // Only use dev fallback in development
                    ...options.headers,
                },
            }, authToken);

            // Check if response indicates update requirement
            const updateCheck = await apiClient.checkForUpdateRequirement(response.clone());
            if (updateCheck.updateRequired && globalUpdateHandler) {
                globalUpdateHandler(updateCheck.updateInfo);
                // Still throw error to handle the API call appropriately
                throw new Error(`APP_UPDATE_REQUIRED: ${updateCheck.updateInfo.message}`);
            }

            if (!response.ok) {
                const errorData = await response.text();
                console.error('API Error Response:', errorData);
                
                // Try to parse JSON error response for specific error codes
                let parsedError = null;
                try {
                    parsedError = JSON.parse(errorData);
                } catch (parseError) {
                    // If parsing fails, continue with text error handling
                }
                
                // Only retry with development token in development environment
                if (response.status === 401 && token && authToken === token && __DEV__) {
                    console.log('🔧 Clerk token failed with 401, retrying with development auth');
                    
                    const retryResponse = await apiClient.makeRequest(endpoint, {
                        ...options,
                        headers: {
                            'x-clerk-user-id': 'dev-user-id',
                            ...options.headers,
                        },
                    }, 'dev:frontend-user-123:frontend-dev@plannr.app');
                    
                    if (!retryResponse.ok) {
                        const retryErrorData = await retryResponse.text();
                        console.error('Development auth also failed:', retryErrorData);
                        throw new Error(`Authentication failed. Please try signing out and back in.`);
                    }
                    
                    console.log('✅ Development auth retry successful');
                    return await retryResponse.json();
                }
                
                // Handle specific error codes from backend
                if (parsedError && parsedError.error) {
                    if (parsedError.error === 'GOOGLE_ACCOUNT_REAUTH_NEEDED' || parsedError.error === 'GOOGLE_ACCOUNT_NOT_FOUND') {
                        const specificError = new Error(parsedError.error);
                        specificError.message = parsedError.message || specificError.message;
                        specificError.errorCode = parsedError.error;
                        throw specificError;
                    }
                }
                
                // Provide user-friendly error messages in production
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please sign out and back in.');
                } else if (response.status === 429) {
                    // Rate limiting - provide helpful message
                    const errorData = await response.text();
                    let rateLimitError;
                    try {
                        const errorJson = JSON.parse(errorData);
                        if (errorJson.message?.includes('text-to-tasks')) {
                            rateLimitError = new Error('TOO_MANY_REQUESTS: Text-to-tasks rate limit exceeded');
                        } else {
                            rateLimitError = new Error('TOO_MANY_REQUESTS: Rate limit exceeded');
                        }
                        rateLimitError.retryAfter = errorJson.retryAfter;
                        rateLimitError.resetTime = errorJson.resetTime;
                    } catch {
                        rateLimitError = new Error('TOO_MANY_REQUESTS: Rate limit exceeded');
                    }
                    throw rateLimitError;
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                } else if (response.status >= 400) {
                    throw new Error('Request failed. Please check your input and try again.');
                } else {
                    throw new Error('Network error. Please check your connection and try again.');
                }
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    };

    // Enhanced sync function that gets user data from Clerk
    const syncUserToBackend = async () => {
        try {
            console.log('=== Starting syncUserToBackend ===');
            console.log('API Base URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
            
            // Get the token first, which should be available after authentication
            const token = await getToken();
            
            if (!token) {
                throw new Error('No authentication token available');
            }

            // Extract user ID from the token payload
            let userIdFromToken = null;
            let userEmail = null;
            try {
                // Decode JWT to get user data (basic decode, not verification)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const payload = JSON.parse(jsonPayload);
                userIdFromToken = payload.sub || payload.user_id || payload.id;
                userEmail = payload.email;
                console.log('Extracted from token - User ID:', userIdFromToken, 'Email:', userEmail);
            } catch (decodeError) {
                console.error('Failed to decode token:', decodeError);
            }

            // Use token user ID or fallback to hook user ID
            let currentUserId = userIdFromToken || userId;
            
            if (!currentUserId) {
                console.log('No user ID available from token or auth hook');
                throw new Error('No user ID available after authentication');
            }

            console.log('Syncing user with ID:', currentUserId);

            // Get additional user data if available from auth context
            let userData = {
                clerkUserId: currentUserId,
            };

            // Add email if we have it
            if (userEmail) {
                userData.email = userEmail;
            }

            // Try to get more user data from the auth hook if available
            if (user) {
                console.log('Adding user data from auth context');
                if (user.emailAddresses?.[0]?.emailAddress) {
                    userData.email = user.emailAddresses[0].emailAddress;
                }
                if (user.firstName || user.lastName) {
                    userData.displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                }
                // Avatar will be assigned randomly by backend, no longer using Clerk imageUrl
            }

            console.log('Syncing user data:', userData);

            // Send user data to backend
            return makeAuthenticatedRequest('/api/users/sync', {
                method: 'POST',
                body: JSON.stringify(userData),
            });
        } catch (error) {
            console.error('Sync user error:', error);
            throw error;
        }
    };

    return {
        // Direct access to the authenticated request function
        makeAuthenticatedRequest,
        
        // Manual sync function
        syncUserToBackend,
        
        // User profile operations
        getUserProfile: () => makeAuthenticatedRequest('/api/users/profile'),
        updateUserProfile: (data) => makeAuthenticatedRequest('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        updateUserEmail: (data) => makeAuthenticatedRequest('/api/users/email', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        updateAvatar: (avatarName) => makeAuthenticatedRequest('/api/users/avatar', {
            method: 'PUT',
            body: JSON.stringify({ avatarName }),
        }),
        markOnboardingComplete: () => makeAuthenticatedRequest('/api/users/onboarding/complete', {
            method: 'POST',
        }),
        deleteUserAccount: () => makeAuthenticatedRequest('/api/users/account', {
            method: 'DELETE',
        }),
        
        // Schedules operations  
        getSchedules: () => makeAuthenticatedRequest('/api/schedules'),
        createSchedule: (data) => makeAuthenticatedRequest('/api/schedules', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getScheduleById: (id, includeBlocks = true) => makeAuthenticatedRequest(`/api/schedules/${id}?includeBlocks=${includeBlocks}`),
        updateSchedule: (id, data) => makeAuthenticatedRequest(`/api/schedules/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        deleteSchedule: (id) => makeAuthenticatedRequest(`/api/schedules/${id}`, {
            method: 'DELETE',
        }),

        // Days operations
        getDaysByScheduleId: (scheduleId) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days`),
        createDay: (scheduleId, dayData) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days`, {
            method: 'POST',
            body: JSON.stringify(dayData),
        }),
        getDayById: (scheduleId, dayId, includeBlocks = false) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}${includeBlocks ? '?includeBlocks=true' : ''}`),
        updateDay: (scheduleId, dayId, data) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        deleteDay: (scheduleId, dayId) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}`, {
            method: 'DELETE',
        }),

        // Day-based Block operations (new architecture)
        getBlocksByDayId: (scheduleId, dayId) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks`),
        addBlocksToDay: (scheduleId, dayId, blocks) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks`, {
            method: 'POST',
            body: JSON.stringify({ blocks }),
        }),
        updateBlockInDay: (scheduleId, dayId, blockId, data) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks/${blockId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        deleteBlockFromDay: (scheduleId, dayId, blockId) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks/${blockId}`, {
            method: 'DELETE',
        }),
        markBlockCompleteInDay: (scheduleId, dayId, blockId, completed = true) => makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks/${blockId}/complete`, {
            method: 'PATCH',
            body: JSON.stringify({ completed }),
        }),

        // Preferences operations
        getPreferences: () => makeAuthenticatedRequest('/api/preferences'),
        updatePreferences: (data) => makeAuthenticatedRequest('/api/preferences', {
            method: 'PUT', 
            body: JSON.stringify(data),
        }),

        // Days-based schedule saving (new architecture)
        saveScheduleWithDays: async (scheduleObject, scheduleName, strategy = 'earliest-fit', startTime = 900, endTime = 1700) => {
            try {
                console.log('📤 Saving schedule with days-based architecture...');
                
                // 1. Convert schedule to backend format and create the schedule
                const scheduleData = {
                    title: scheduleName,
                    numDays: scheduleObject.numDays,
                    day1Date: scheduleObject.day1Date, // ScheduleDate object
                    day1Day: scheduleObject.day1Day,
                    minGap: scheduleObject.minGap,
                    workingHoursLimit: scheduleObject.workingHoursLimit,
                    strategy: strategy,
                    startTime: startTime,
                    endTime: endTime,
                    metadata: {
                        eventDependencies: scheduleObject.eventDependencies,
                        frontendGenerated: true,
                        generatedAt: new Date().toISOString()
                    }
                };

                const scheduleResponse = await makeAuthenticatedRequest('/api/schedules', {
                    method: 'POST',
                    body: JSON.stringify(scheduleData),
                });

                if (!scheduleResponse.success) {
                    throw new Error(`Failed to create schedule: ${scheduleResponse.message}`);
                }

                const scheduleId = scheduleResponse.data.id;
                console.log('✅ Schedule created:', scheduleId);

                // 2. Create days and add blocks
                const datesList = scheduleObject.getAllDatesInOrder();
                const createdDays = [];

                // Helper function to convert date ID string back to ScheduleDate object
                const parseScheduleDateId = (dateId) => {
                    const parts = dateId.split('-');
                    return new ScheduleDate(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
                };

                for (let i = 0; i < datesList.length; i++) {
                    const dateId = datesList[i]; // This is a string like "7-10-2025"
                    const date = parseScheduleDateId(dateId); // Convert to ScheduleDate object
                    const daySchedule = scheduleObject.getScheduleForDate(dateId);
                    
                    // Create day data
                    const dayData = {
                        dayNumber: i + 1,
                        dayName: daySchedule.day,
                        date: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.date).padStart(2, '0')}`,
                        dateObject: serializeScheduleDate(date), // Properly serialize the ScheduleDate object
                        isWeekend: daySchedule.day === 'Saturday' || daySchedule.day === 'Sunday',
                        minGap: daySchedule.minGap,
                        maxWorkingHours: daySchedule.workingHoursLimit,
                        metadata: {
                            dayType: (daySchedule.day === 'Saturday' || daySchedule.day === 'Sunday') ? 'weekend' : 'weekday',
                            totalBlocks: daySchedule.timeBlocks.length,
                            events: daySchedule.events.length,
                            breaks: daySchedule.breaks.length
                        }
                    };

                    // Create the day
                    const dayResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days`, {
                        method: 'POST',
                        body: JSON.stringify(dayData),
                    });

                    if (!dayResponse.success) {
                        throw new Error(`Failed to create day ${i + 1}: ${dayResponse.message}`);
                    }

                    const dayId = dayResponse.data.id;
                    createdDays.push({ id: dayId, date: date, daySchedule: daySchedule });
                    console.log(`✅ Created day ${i + 1} (${daySchedule.day}):`, dayId);

                    // Convert time blocks to backend format
                    const timeBlocks = daySchedule.getTimeBlocks();
                    if (timeBlocks.length > 0) {
                        const blocksData = timeBlocks.map(block => {
                            const serialized = serializeTimeBlock(block);
                            return {
                                type: serialized.type,
                                title: serialized.name,
                                startAt: serialized.startTime,
                                endAt: serialized.endTime,
                                blockDate: dayData.date,
                                dateObject: serializeScheduleDate(date), // Properly serialize the ScheduleDate object
                                category: serialized.activityType,
                                priority: serialized.priority,
                                deadline: serialized.deadline ? `${serialized.deadline.year}-${String(serialized.deadline.month).padStart(2, '0')}-${String(serialized.deadline.date).padStart(2, '0')}` : null,
                                deadlineObject: serialized.deadline, // This is already serialized by serializeTimeBlock
                                duration: serialized.duration,
                                completed: serialized.completed || false,
                                metadata: {
                                    activityType: serialized.activityType,
                                    priority: serialized.priority,
                                    frontendId: `${serialized.type}-${serialized.name?.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
                                    originalBlock: true
                                }
                            };
                        });

                        // Add blocks to the day
                        const blocksResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks`, {
                            method: 'POST',
                            body: JSON.stringify({ blocks: blocksData }),
                        });

                        if (!blocksResponse.success) {
                            throw new Error(`Failed to add blocks to day ${i + 1}: ${blocksResponse.message}`);
                        }

                        // CRITICAL FIX: Update frontend TimeBlock objects with backend IDs
                        const createdBlocks = blocksResponse.data || [];
                        console.log('🔍 Backend returned blocks:', createdBlocks);
                        timeBlocks.forEach((frontendBlock, blockIndex) => {
                            if (createdBlocks[blockIndex] && createdBlocks[blockIndex].id) {
                                frontendBlock.setBackendId(createdBlocks[blockIndex].id);
                                console.log(`🔗 Updated block "${frontendBlock.name}" with backend ID:`, createdBlocks[blockIndex].id);
                            }
                        });

                        console.log(`✅ Added ${blocksData.length} blocks to day ${i + 1}`);
                    }
                }

                // 3. Save event dependencies if they exist
                let savedDependencies = null;
                if (scheduleObject.events && scheduleObject.events.length > 0 && convertEventDependenciesToNameMap) {
                    try {
                        const dependenciesMap = convertEventDependenciesToNameMap(scheduleObject.events);
                        if (dependenciesMap && Object.keys(dependenciesMap).length > 0) {
                            console.log('💾 Saving event dependencies...');
                            const dependenciesResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies`, {
                                method: 'POST',
                                body: JSON.stringify({ dependenciesMap }),
                            });
                            
                            if (dependenciesResponse.success) {
                                savedDependencies = dependenciesResponse.data;
                                console.log('✅ Event dependencies saved successfully');
                            } else {
                                console.warn('⚠️ Failed to save dependencies, but continuing:', dependenciesResponse.message);
                            }
                        }
                    } catch (depError) {
                        console.warn('⚠️ Failed to save dependencies, but continuing:', depError);
                        // Don't fail the entire operation if dependencies fail
                    }
                }

                console.log('✅ Successfully saved schedule with days-based architecture');
                return {
                    scheduleId,
                    daysCreated: createdDays.length,
                    dependenciesSaved: savedDependencies ? true : false,
                    updatedScheduleObject: scheduleObject, // Return the updated schedule with backend IDs
                    success: true
                };

            } catch (error) {
                console.error('❌ Failed to save schedule with days:', error);
                throw error;
            }
        },

        // Helper to convert Schedule object to days format for API
        convertScheduleToAPIFormat: (scheduleObject) => {
            try {
                const datesList = scheduleObject.getAllDatesInOrder();
                const daysData = [];

                for (let i = 0; i < datesList.length; i++) {
                    const date = datesList[i];
                    const daySchedule = scheduleObject.getScheduleForDate(date);
                    const timeBlocks = daySchedule.getTimeBlocks();

                    const dayData = {
                        dayNumber: i + 1,
                        dayName: daySchedule.day,
                        date: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.date).padStart(2, '0')}`,
                        dateObject: date,
                        isWeekend: daySchedule.day === 'Saturday' || daySchedule.day === 'Sunday',
                        minGap: daySchedule.minGap,
                        maxWorkingHours: daySchedule.workingHoursLimit,
                        metadata: {
                            dayType: (daySchedule.day === 'Saturday' || daySchedule.day === 'Sunday') ? 'weekend' : 'weekday',
                            totalBlocks: timeBlocks.length,
                            events: daySchedule.events.length,
                            breaks: daySchedule.breaks.length
                        },
                        timeBlocks: timeBlocks.map(block => {
                            const serialized = serializeTimeBlock(block);
                            return {
                                type: serialized.type,
                                title: serialized.name,
                                startAt: serialized.startTime,
                                endAt: serialized.endTime,
                                blockDate: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.date).padStart(2, '0')}`,
                                dateObject: date,
                                category: serialized.activityType,
                                priority: serialized.priority,
                                deadline: serialized.deadline ? `${serialized.deadline.year}-${String(serialized.deadline.month).padStart(2, '0')}-${String(serialized.deadline.date).padStart(2, '0')}` : null,
                                deadlineObject: serialized.deadline,
                                duration: serialized.duration,
                                completed: serialized.completed || false,
                                metadata: {
                                    activityType: serialized.activityType,
                                    priority: serialized.priority,
                                    frontendId: `${serialized.type}-${serialized.name?.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
                                    originalBlock: true
                                }
                            };
                        })
                    };

                    daysData.push(dayData);
                }

                return daysData;
            } catch (error) {
                console.error('Failed to convert schedule to API format:', error);
                throw error;
            }
        },

        // Schedule reconstruction from database with days-based architecture support
        loadScheduleFromDatabase: async (scheduleId) => {
            try {
                // Get schedule with blocks from database
                const scheduleData = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}?includeBlocks=true`);
                
                if (!scheduleData.success || !scheduleData.data) {
                    throw new Error('Failed to fetch schedule data from database');
                }

                const schedule = scheduleData.data;

                // Get dependencies separately from the dependencies API
                let dependenciesMap = null;
                try {
                    const dependenciesResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies`);
                    if (dependenciesResponse.success && dependenciesResponse.data) {
                        dependenciesMap = dependenciesResponse.data.dependenciesMap;
                        console.log('✅ Retrieved dependencies for schedule:', scheduleId);
                    }
                } catch (depError) {
                    console.warn('Failed to retrieve dependencies for schedule:', scheduleId, depError);
                    // Continue without dependencies - not fatal
                }

                // Check if this is the new days-based architecture or legacy blocks-based
                let blocks = [];
                if (schedule.blocks) {
                    // Legacy blocks-based approach
                    blocks = schedule.blocks;
                } else {
                    // New days-based approach - get blocks through days
                    const daysResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days`);
                    console.log("===========DAYS RESPONSE============", daysResponse);
                    if (daysResponse.success) {
                        const days = daysResponse.data;
                        for (const day of days) {
                            const dayBlocksResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${day.id}/blocks`);
                            if (dayBlocksResponse.success) {
                                blocks.push(...dayBlocksResponse.data.map(block => ({
                                    ...block,
                                    // Ensure we have the proper date information
                                    blockDate: day.date,
                                    dateObject: day.dateObject,
                                    dayNumber: day.dayNumber,
                                    dayName: day.dayName
                                })));
                            }
                        }
                    }
                }

                // Convert database format to serialized format expected by parseSchedule
                const serializedSchedule = {
                    numDays: schedule.numDays,
                    day1Date: schedule.day1Date, // Already in ScheduleDate format from JSONB
                    day1Day: schedule.day1Day,
                    minGap: schedule.minGap,
                    workingHoursLimit: schedule.workingHoursLimit,
                    strategy: schedule.strategy,
                    startTime: schedule.startTime, // Convert integer to Time24 format
                    endTime: schedule.endTime,
                    eventDependencies: dependenciesMap || {}, // Use fetched dependencies or empty object
                    schedule: [], // We'll build this from blocks
                    parseFromBackend: true // Important: This tells ScheduleHandler we're parsing from backend
                };

                // Group blocks by date to reconstruct the schedule map
                const blocksByDate = {};
                blocks.forEach(block => {
                    const dateKey = block.blockDate;
                    if (!blocksByDate[dateKey]) {
                        blocksByDate[dateKey] = [];
                    }
                    
                    // Convert database block to serialized TimeBlock format
                    // Note: startTime and endTime must be in Time24 integer format (HHMM) for parseTimeBlock to work
                    const serializedBlock = {
                        name: block.title,
                        date: block.dateObject || { 
                            date: parseInt(block.blockDate.split('-')[2]),
                            month: parseInt(block.blockDate.split('-')[1]),
                            year: parseInt(block.blockDate.split('-')[0])
                        },
                        activityType: block.category,
                        priority: block.priority,
                        startTime: block.startAt, // Already in Time24 format from database
                        endTime: block.endAt,     // Already in Time24 format from database
                        duration: block.duration,
                        completed: block.completed,
                        deadline: block.deadlineObject || (block.deadline ? { 
                            date: parseInt(block.deadline.split('-')[2] || 1),
                            month: parseInt(block.deadline.split('-')[1] || 1),
                            year: parseInt(block.deadline.split('-')[0] || 2025)
                        } : null),
                        type: block.type,
                        backendId: block.id // Include backend ID for syncing
                    };

                    blocksByDate[dateKey].push(serializedBlock);
                });

                // Convert blocks map to the format expected by parseSchedule with complete DaySchedule objects
                serializedSchedule.schedule = Object.entries(blocksByDate).map(([dateKey, blocks]) => {
                    // Get day information from the first block (they all have the same date)
                    const firstBlock = blocks[0];
                    const dayName = firstBlock?.dayName || 'Monday'; // Fallback to Monday
                    const dateObject = firstBlock?.dateObject || {
                        date: parseInt(dateKey.split('-')[2]),
                        month: parseInt(dateKey.split('-')[1]),
                        year: parseInt(dateKey.split('-')[0])
                    };

                    // Create complete DaySchedule object with all required fields
                    const daySchedule = {
                        day: dayName,
                        date: dateObject,
                        minGap: schedule.minGap,
                        workingHoursLimit: schedule.workingHoursLimit,
                        events: [], // Events are separate from timeBlocks in the architecture
                        breaks: [], // Breaks are separate from timeBlocks in the architecture  
                        timeBlocks: blocks
                    };

                    return [dateKey, daySchedule];
                });

                // Use existing parseSchedule handler to reconstruct Schedule object
                const reconstructedSchedule = parseSchedule(serializedSchedule);
                
                if (!reconstructedSchedule) {
                    throw new Error('Failed to parse reconstructed schedule');
                }

                console.log('✅ Successfully reconstructed Schedule object from database');
                return reconstructedSchedule;

            } catch (error) {
                console.error('Failed to load and reconstruct schedule from database:', error);
                throw error;
            }
        },

        // Load complete app state with reconstructed Schedule objects
        loadCompleteAppStateWithSchedules: async () => {
            try {
                // First load basic app state
                const basicAppState = await makeAuthenticatedRequest('/api/users/profile')
                    .then(async (userProfile) => {
                        const preferences = await makeAuthenticatedRequest('/api/preferences');
                        const schedules = await makeAuthenticatedRequest('/api/schedules');

                        return {
                            name: userProfile.data.displayName || '',
                            avatarName: userProfile.data.avatarName || 'cat',
                            onboarded: Boolean(userProfile.data.onboarded),
                            firstLaunch: false,
                            userPreferences: {
                                theme: preferences.data.theme || 'light',
                                defaultStrategy: preferences.data.defaultStrategy || 'earliest-fit',
                                defaultMinGap: preferences.data.defaultMinGap || '15',
                                defaultMaxWorkingHours: preferences.data.defaultMaxWorkingHours || '8',
                                taskRemindersEnabled: preferences.data.taskRemindersEnabled ?? true,
                                leadMinutes: preferences.data.leadMinutes || '30',
                                nickname: preferences.data.nickname || ''
                            },
                            savedSchedules: schedules.data.map(schedule => ({
                                name: schedule.title,
                                backendId: schedule.id,
                                schedule: null,
                                isActive: Boolean(schedule.isActive || false)
                            })),
                            activeSchedule: schedules.data.find(s => s.isActive) ? (() => {
                                const activeSchedule = schedules.data.find(s => s.isActive);
                                return {
                                    name: activeSchedule.title,
                                    backendId: activeSchedule.id,
                                    schedule: null,
                                    isActive: true
                                };
                            })() : null
                        };
                    });
                
                // Then load Schedule objects for saved schedules (parallel loading)
                const schedulePromises = basicAppState.savedSchedules
                    .filter(s => s.backendId)
                    .map(async (savedSchedule) => {
                        try {
                            const scheduleObject = await makeAuthenticatedRequest(`/api/schedules/${savedSchedule.backendId}?includeBlocks=true`)
                                .then(async scheduleData => {
                                    if (!scheduleData.success || !scheduleData.data) {
                                        throw new Error('Failed to fetch schedule data from database');
                                    }

                                    const schedule = scheduleData.data;

                                    // Get dependencies separately from the dependencies API
                                    let dependenciesMap = null;
                                    try {
                                        const dependenciesResponse = await makeAuthenticatedRequest(`/api/schedules/${savedSchedule.backendId}/dependencies`);
                                        if (dependenciesResponse.success && dependenciesResponse.data) {
                                            dependenciesMap = dependenciesResponse.data.dependenciesMap;
                                            console.log('✅ Retrieved dependencies for schedule:', savedSchedule.backendId);
                                            console.log('Dependencies Map:', dependenciesMap);
                                        }
                                    } catch (depError) {
                                        console.warn('Failed to retrieve dependencies for schedule:', savedSchedule.backendId, depError);
                                        // Continue without dependencies - not fatal
                                    }

                                    // console.log('Schedule Data for ID', savedSchedule.backendId, ':', schedule);

                                    const serializedSchedule = {
                                        numDays: schedule.numDays,
                                        day1Date: schedule.day1Date,
                                        day1Day: schedule.day1Day,
                                        minGap: schedule.minGap,
                                        workingHoursLimit: schedule.workingHoursLimit,
                                        strategy: schedule.strategy,
                                        startTime: schedule.startTime,
                                        endTime: schedule.endTime,
                                        eventDependencies: dependenciesMap || {}, // Use fetched dependencies or empty object
                                        schedule: [],
                                        parseFromBackend: true // Important: This tells ScheduleHandler we're parsing from backend
                                    };

                                    const blocksByDate = {};
                                    schedule.blocks.forEach(block => {
                                        const dateKey = block.blockDate;
                                        if (!blocksByDate[dateKey]) {
                                            blocksByDate[dateKey] = [];
                                        }

                                        blocksByDate[dateKey].push({
                                            name: block.title,
                                            date: block.dateObject || { 
                                                date: parseInt(block.blockDate.split('-')[2]),
                                                month: parseInt(block.blockDate.split('-')[1]),
                                                year: parseInt(block.blockDate.split('-')[0])
                                            },
                                            activityType: block.category,
                                            priority: block.priority,
                                            startTime: block.startAt,
                                            endTime: block.endAt,
                                            duration: block.duration,
                                            completed: block.completed,
                                            deadline: block.deadlineObject || block.deadline ? { 
                                                date: parseInt(block.deadline?.split('-')[2] || 1),
                                                month: parseInt(block.deadline?.split('-')[1] || 1),
                                                year: parseInt(block.deadline?.split('-')[0] || 2025)
                                            } : null,
                                            type: block.type,
                                            backendId: block.id // Include backend ID for syncing
                                        });
                                    });

                                    serializedSchedule.schedule = Object.entries(blocksByDate).map(([dateKey, blocks]) => {
                                        // Create complete DaySchedule object with all required fields
                                        const dateObject = {
                                            date: parseInt(dateKey.split('-')[2]),
                                            month: parseInt(dateKey.split('-')[1]),
                                            year: parseInt(dateKey.split('-')[0])
                                        };

                                        const reverseDateKey = `${String(dateObject.date)}-${String(dateObject.month)}-${String(dateObject.year)}`;

                                        const daySchedule = {
                                            day: 'Monday', // We don't have day name in legacy format, use default
                                            date: dateObject,
                                            minGap: schedule.minGap,
                                            workingHoursLimit: schedule.workingHoursLimit,
                                            events: [], // Events are separate from timeBlocks
                                            breaks: [], // Breaks are separate from timeBlocks
                                            timeBlocks: blocks
                                        };

                                        return [reverseDateKey, daySchedule];
                                    });

                                    // console.log("Parsed Schedule:", parseSchedule(serializedSchedule));
                                    return parseSchedule(serializedSchedule);
                                });
                            return {
                                ...savedSchedule,
                                schedule: scheduleObject
                            };
                        } catch (error) {
                            console.warn(`Failed to load schedule ${savedSchedule.name}:`, error);
                            return savedSchedule;
                        }
                    });

                const reconstructedSchedules = await Promise.all(schedulePromises);

                const completeAppState = {
                    ...basicAppState,
                    savedSchedules: reconstructedSchedules,
                    activeSchedule: reconstructedSchedules.find(s => s.isActive) || null
                };

                console.log('✅ Loaded complete app state with reconstructed Schedule objects');
                return completeAppState;

            } catch (error) {
                console.error('Failed to load complete app state with schedules:', error);
                throw error;
            }
        },

        // Standalone helper to load a single Schedule object by ID
        loadScheduleObjectById: async (scheduleId) => {
            try {
                const scheduleData = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}?includeBlocks=true`);
                
                if (!scheduleData.success || !scheduleData.data) {
                    throw new Error('Failed to fetch schedule data from database');
                }

                const { schedule, blocks } = scheduleData.data;

                // Get dependencies separately from the dependencies API
                let dependenciesMap = null;
                try {
                    const dependenciesResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies`);
                    if (dependenciesResponse.success && dependenciesResponse.data) {
                        dependenciesMap = dependenciesResponse.data.dependenciesMap;
                        console.log('✅ Retrieved dependencies for schedule:', scheduleId);
                    }
                } catch (depError) {
                    console.warn('Failed to retrieve dependencies for schedule:', scheduleId, depError);
                    // Continue without dependencies - not fatal
                }

                const serializedSchedule = {
                    numDays: schedule.numDays,
                    day1Date: schedule.day1Date,
                    day1Day: schedule.day1Day,
                    minGap: schedule.minGap,
                    workingHoursLimit: schedule.workingHoursLimit,
                    strategy: schedule.strategy,
                    startTime: { hour: Math.floor(schedule.startTime / 100), minute: schedule.startTime % 100 },
                    endTime: { hour: Math.floor(schedule.endTime / 100), minute: schedule.endTime % 100 },
                    eventDependencies: dependenciesMap || {}, // Use fetched dependencies or empty object
                    schedule: [],
                    parseFromBackend: true // Important: This tells ScheduleHandler we're parsing from backend
                };

                const blocksByDate = {};
                blocks.forEach(block => {
                    const dateKey = block.blockDate;
                    if (!blocksByDate[dateKey]) {
                        blocksByDate[dateKey] = [];
                    }
                    
                    blocksByDate[dateKey].push({
                        name: block.title,
                        date: block.dateObject || { 
                            date: parseInt(block.blockDate.split('-')[2]),
                            month: parseInt(block.blockDate.split('-')[1]),
                            year: parseInt(block.blockDate.split('-')[0])
                        },
                        activityType: block.category,
                        priority: block.priority,
                        startTime: { hour: Math.floor(block.startAt / 100), minute: block.startAt % 100 },
                        endTime: { hour: Math.floor(block.endAt / 100), minute: block.endAt % 100 },
                        duration: block.duration,
                        completed: block.completed,
                        deadline: block.deadlineObject || block.deadline ? { 
                            date: parseInt(block.deadline?.split('-')[2] || 1),
                            month: parseInt(block.deadline?.split('-')[1] || 1),
                            year: parseInt(block.deadline?.split('-')[0] || 2025)
                        } : null,
                        type: block.type,
                        backendId: block.id // Include backend ID for syncing
                    });
                });

                serializedSchedule.schedule = Object.entries(blocksByDate).map(([dateKey, blocks]) => {
                    // Create complete DaySchedule object with all required fields
                    const dateObject = {
                        date: parseInt(dateKey.split('-')[2]),
                        month: parseInt(dateKey.split('-')[1]),
                        year: parseInt(dateKey.split('-')[0])
                    };

                    const daySchedule = {
                        day: 'Monday', // We don't have day name in legacy format, use default
                        date: dateObject,
                        minGap: schedule.minGap,
                        workingHoursLimit: schedule.workingHoursLimit,
                        events: [], // Events are separate from timeBlocks
                        breaks: [], // Breaks are separate from timeBlocks
                        timeBlocks: blocks
                    };

                    return [dateKey, daySchedule];
                });

                const reconstructedSchedule = parseSchedule(serializedSchedule);
                
                if (!reconstructedSchedule) {
                    throw new Error('Failed to parse reconstructed schedule');
                }

                console.log(`✅ Successfully loaded Schedule object for ID: ${scheduleId}`);
                return reconstructedSchedule;

            } catch (error) {
                console.error(`Failed to load Schedule object for ID ${scheduleId}:`, error);
                throw error;
            }
        },

        // Google Calendar integration functions
        checkGoogleCalendarStatus: async () => {
            try {
                const response = await makeAuthenticatedRequest('/api/integrations/google-calendar/status');
                return response.data.connected;
            } catch (error) {
                console.error('Failed to check Google Calendar status:', error);
                throw error;
            }
        },

        exportScheduleToGoogleCalendar: async (schedule, userTimezone = 'UTC', accessToken = null, scheduleName = null, userName = null) => {
            try {
                console.log('🔄 Starting Google Calendar export...');
                console.log('🔍 Access token provided:', !!accessToken);
                
                if (!schedule || !schedule.getSchedule) {
                    throw new Error('Invalid schedule object provided');
                }

                // Convert Schedule object to Google Calendar events format
                const events = [];
                const scheduleMap = schedule.getSchedule();

                // Iterate through each day in the schedule
                for (const [dayKey, daySchedule] of scheduleMap) {
                    const timeBlocks = daySchedule.getTimeBlocks();
                    
                    // Skip empty days
                    if (!timeBlocks || timeBlocks.length === 0) {
                        continue;
                    }

                    for (const timeBlock of timeBlocks) {
                        // Skip breaks or completed tasks if desired
                        if (timeBlock.type === 'break') {
                            continue;
                        }

                        // Convert TimeBlock to Google Calendar event format
                        const event = convertTimeBlockToCalendarEvent(timeBlock, userTimezone);
                        if (event) {
                            events.push(event);
                        }
                    }
                }

                if (events.length === 0) {
                    throw new Error('No events found in schedule to export');
                }

                console.log(`📅 Exporting ${events.length} events to Google Calendar`);

                // Prepare request body with optional fields
                const requestBody = { events };
                if (accessToken) {
                    requestBody.accessToken = accessToken;
                }
                if (scheduleName) {
                    requestBody.scheduleName = scheduleName;
                }
                if (userName) {
                    requestBody.userName = userName;
                }

                console.log('🔍 [DEBUG] Request body:', {
                    eventCount: events.length,
                    hasAccessToken: !!accessToken,
                    scheduleName,
                    userName
                });

                // Send to backend API
                const response = await makeAuthenticatedRequest('/api/integrations/google-calendar/export', {
                    method: 'POST',
                    body: JSON.stringify(requestBody)
                });

                console.log('✅ Successfully exported to Google Calendar:', response.data);
                return response.data;

            } catch (error) {
                console.error('❌ Google Calendar export failed:', error);
                
                // Handle specific Google Calendar authentication errors
                if (error.errorCode === 'GOOGLE_ACCOUNT_REAUTH_NEEDED' || error.errorCode === 'GOOGLE_ACCOUNT_NOT_FOUND') {
                    // Import Alert here to avoid circular dependencies
                    const { Alert } = require('react-native');
                    Alert.alert(
                        'Google Calendar Access Required',
                        'Plannr currently does not have access to your Google Calendar. Please sign out and sign in with your Google account again to grant access.',
                        [{ text: 'OK', style: 'default' }]
                    );
                    
                    // Re-throw the error so calling code can handle it appropriately
                    const authError = new Error('GOOGLE_CALENDAR_AUTH_ERROR');
                    authError.originalError = error;
                    authError.errorCode = error.errorCode;
                    throw authError;
                }
                
                throw error;
            }
        },

        // Event Dependencies API
        saveEventDependencies: async (scheduleId, dependenciesMap) => {
            try {
                const response = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies`, {
                    method: 'POST',
                    body: JSON.stringify({ dependenciesMap }),
                });
                return response.data;
            } catch (error) {
                console.error('Failed to save event dependencies:', error);
                throw error;
            }
        },

        updateEventDependencies: async (scheduleId, dependenciesId, dependenciesMap) => {
            try {
                const response = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies/${dependenciesId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ dependenciesMap }),
                });
                return response.data;
            } catch (error) {
                console.error('Failed to update event dependencies:', error);
                throw error;
            }
        },

        getEventDependencies: async (scheduleId) => {
            try {
                const response = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies`);
                return response.data;
            } catch (error) {
                console.error('Failed to get event dependencies:', error);
                throw error;
            }
        },

        // Text-to-Tasks API - Combined function for complete workflow
        parseTextToFlexibleEvents: async (todoListText, defaultDeadline, preferences = { defaultDuration: 60, workingHours: { start: 9, end: 17 }, timezone: 'America/New_York' }) => {
            try {
                console.log('🤖 Starting text-to-tasks parsing...');
                
                // Step 1: Parse text and create session with drafts
                const parseResponse = await makeAuthenticatedRequest('/api/text-to-tasks/parse', {
                    method: 'POST',
                    body: JSON.stringify({
                        text: todoListText,
                        preferences: {
                            defaultDuration: 60,
                            workingHours: { start: 9, end: 17 },
                            timezone: 'America/New_York',
                            ...preferences
                        }
                    }),
                });

                if (!parseResponse.success) {
                    throw new Error(`Parse failed: ${parseResponse.error || 'Unknown error'}`);
                }

                console.log('📊 Parse response data:', JSON.stringify(parseResponse.data, null, 2));

                const { sessionId, drafts, meta } = parseResponse.data;
                console.log(`✅ Parse successful: ${drafts.length} tasks parsed from ${meta?.inputStats?.itemsDetected || 'unknown'} detected items`);

                // Step 2: Convert drafts to FlexibleEvent instances
                
                const flexibleEvents = drafts.map(draft => {
                    // Handle deadline conversion from backend format to ScheduleDate
                    let deadline = null;
                    if (draft.deadline) {
                        if (typeof draft.deadline === 'object' && draft.deadline.date && draft.deadline.month && draft.deadline.year) {
                            // Already in ScheduleDate format
                            deadline = new ScheduleDate(draft.deadline.date, draft.deadline.month, draft.deadline.year);
                        } else if (typeof draft.deadline === 'string') {
                            // ISO string format - parse to ScheduleDate
                            const date = new Date(draft.deadline);
                            deadline = new ScheduleDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
                        }
                    } else {
                        deadline = defaultDeadline || null;
                    }

                    // Extract FlexibleEvent data - prioritize enrichment data if available
                    let eventData;
                    if (draft.enrichment?.originalFlexibleEvent) {
                        // Use the enrichment data which has the correct types from LLM
                        eventData = {
                            name: draft.enrichment.originalFlexibleEvent.name || draft.title,
                            type: draft.enrichment.originalFlexibleEvent.type || 'OTHER',
                            duration: draft.enrichment.originalFlexibleEvent.duration || draft.durationMinutes,
                            priority: draft.enrichment.originalFlexibleEvent.priority || draft.priority,
                            deadline: deadline,
                            id: draft.enrichment.originalFlexibleEvent.id || draft.id
                        };
                    } else {
                        // Fallback to parsing from draft fields
                        eventData = {
                            name: draft.title,
                            type: draft.notes?.includes('Activity Type: ') 
                                ? draft.notes.replace('Activity Type: ', '').trim()
                                : 'OTHER',
                            duration: draft.durationMinutes,
                            priority: draft.priority,
                            deadline: deadline,
                            id: draft.id
                        };
                    }

                    // Debug logging to see what type we're getting
                    console.log(`🔍 Task: "${draft.title}" - Type from enrichment: ${draft.enrichment?.originalFlexibleEvent?.type}, Type from notes: ${draft.notes?.includes('Activity Type: ') ? draft.notes.replace('Activity Type: ', '').trim() : 'N/A'}, Final type: ${eventData.type}`);

                    return new FlexibleEvent(
                        eventData.name,
                        eventData.type,
                        eventData.duration,
                        eventData.priority,
                        deadline,
                        eventData.id || draft.id
                    );
                });

                // Step 3: Return structured result
                return {
                    success: true,
                    flexibleEvents,
                    sessionId,
                    stats: {
                        totalTasks: meta?.inputStats?.itemsDetected || drafts.length,
                        validTasks: drafts.length,
                        warnings: parseResponse.data.warnings?.length || 0
                    },
                    warnings: drafts.filter(draft => draft.warnings && draft.warnings.length > 0)
                        .flatMap(draft => draft.warnings)
                };

            } catch (error) {
                console.error('❌ Text-to-tasks parsing failed:', error);
                throw error;
            }
        },
    };
};

/**
 * Convert a TimeBlock to Google Calendar event format
 * @param {TimeBlock} timeBlock - The time block to convert
 * @param {string} userTimezone - User's timezone (e.g., 'America/Vancouver')
 * @returns {Object|null} Google Calendar event object or null if invalid
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

        // Create ISO datetime strings
        const startDateTime = createISODateTime(date, startTime, userTimezone);
        const endDateTime = createISODateTime(date, endTime, userTimezone);

        if (!startDateTime || !endDateTime) {
            console.warn('Failed to create datetime strings for timeBlock:', timeBlock.getName());
            return null;
        }

        // Generate unique ID for the event (use backend ID if available, otherwise generate one)
        const uid = timeBlock.backendId ? `plannr-${timeBlock.backendId}` : `plannr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Build description
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
        description += `\nCreated by Plannr`;

        return {
            uid: uid,
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
 * Create ISO datetime string from ScheduleDate and Time24
 * @param {ScheduleDate} scheduleDate - The date object
 * @param {Time24} time24 - The time object  
 * @param {string} timezone - Timezone string
 * @returns {string|null} ISO datetime string or null if invalid
 */
const createISODateTime = (scheduleDate, time24, timezone) => {
    try {
        if (!scheduleDate || !time24) {
            return null;
        }

        // Get date components
        const year = scheduleDate.year || scheduleDate.getYear?.();
        const month = scheduleDate.month || scheduleDate.getMonth?.();
        const day = scheduleDate.date || scheduleDate.getDay?.();

        if (!year || !month || !day) {
            console.warn('Invalid date components:', { year, month, day });
            return null;
        }

        // Get time components  
        const hour = time24.hour || time24.getHour?.();
        const minute = time24.minute || time24.getMinute?.();

        if (hour === undefined || minute === undefined) {
            console.warn('Invalid time components:', { hour, minute });
            return null;
        }

        // Create JavaScript Date object (month is 0-indexed in JS Date)
        const jsDate = new Date(year, month - 1, day, hour, minute, 0, 0);

        // Return ISO string
        return jsDate.toISOString();

    } catch (error) {
        console.error('Error creating ISO datetime:', error);
        return null;
    }
};
