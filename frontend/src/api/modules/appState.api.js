import { parseSchedule } from '../../persistence/ScheduleHandler';

/**
 * App State API module
 * Orchestration functions that span multiple API domains.
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

/**
 * Load a single schedule object by ID (new days-based architecture).
 * Fetches schedule metadata, iterates days to collect blocks, and
 * reconstructs a Schedule model via parseSchedule.
 */
export const loadScheduleFromDatabase = async (makeAuthenticatedRequest, scheduleId) => {
    const scheduleData = await makeAuthenticatedRequest(
        `/api/schedules/${scheduleId}?includeBlocks=true`,
    );

    if (!scheduleData.success || !scheduleData.data) {
        throw new Error('Failed to fetch schedule data from database');
    }

    const schedule = scheduleData.data;

    // Fetch dependencies (non-fatal)
    let dependenciesMap = null;
    try {
        const dependenciesResponse = await makeAuthenticatedRequest(
            `/api/schedules/${scheduleId}/dependencies`,
        );
        if (dependenciesResponse.success && dependenciesResponse.data) {
            dependenciesMap = dependenciesResponse.data.dependenciesMap;
        }
    } catch (depError) {
        console.warn('Failed to retrieve dependencies for schedule:', scheduleId, depError);
    }

    // Collect blocks — support both legacy (schedule.blocks) and days-based architecture
    let blocks = [];
    if (schedule.blocks) {
        blocks = schedule.blocks;
    } else {
        const daysResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days`);
        if (daysResponse.success) {
            for (const day of daysResponse.data) {
                const dayBlocksResponse = await makeAuthenticatedRequest(
                    `/api/schedules/${scheduleId}/days/${day.id}/blocks`,
                );
                if (dayBlocksResponse.success) {
                    blocks.push(
                        ...dayBlocksResponse.data.map((block) => ({
                            ...block,
                            blockDate: day.date,
                            dateObject: day.dateObject,
                            dayNumber: day.dayNumber,
                            dayName: day.dayName,
                        })),
                    );
                }
            }
        }
    }

    const serializedSchedule = {
        numDays: schedule.numDays,
        day1Date: schedule.day1Date,
        day1Day: schedule.day1Day,
        minGap: schedule.minGap,
        workingHoursLimit: schedule.workingHoursLimit,
        strategy: schedule.strategy,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        eventDependencies: dependenciesMap || {},
        schedule: [],
        parseFromBackend: true,
    };

    const blocksByDate = {};
    blocks.forEach((block) => {
        const dateKey = block.blockDate;
        if (!blocksByDate[dateKey]) blocksByDate[dateKey] = [];

        blocksByDate[dateKey].push({
            name: block.title,
            date: block.dateObject || {
                date: parseInt(block.blockDate.split('-')[2]),
                month: parseInt(block.blockDate.split('-')[1]),
                year: parseInt(block.blockDate.split('-')[0]),
            },
            activityType: block.category,
            priority: block.priority,
            startTime: block.startAt,
            endTime: block.endAt,
            duration: block.duration,
            completed: block.completed,
            deadline:
                block.deadlineObject ||
                (block.deadline
                    ? {
                          date: parseInt(block.deadline.split('-')[2] || 1),
                          month: parseInt(block.deadline.split('-')[1] || 1),
                          year: parseInt(block.deadline.split('-')[0] || 2025),
                      }
                    : null),
            type: block.type,
            backendId: block.id,
        });
    });

    serializedSchedule.schedule = Object.entries(blocksByDate).map(([dateKey, dayBlocks]) => {
        const firstBlock = dayBlocks[0];
        const dayName = firstBlock?.dayName || 'Monday';
        const dateObject = firstBlock?.dateObject || {
            date: parseInt(dateKey.split('-')[2]),
            month: parseInt(dateKey.split('-')[1]),
            year: parseInt(dateKey.split('-')[0]),
        };

        return [
            dateKey,
            {
                day: dayName,
                date: dateObject,
                minGap: schedule.minGap,
                workingHoursLimit: schedule.workingHoursLimit,
                events: [],
                breaks: [],
                timeBlocks: dayBlocks,
            },
        ];
    });

    const reconstructedSchedule = parseSchedule(serializedSchedule);
    if (!reconstructedSchedule) {
        throw new Error('Failed to parse reconstructed schedule');
    }

    console.log('✅ Successfully reconstructed Schedule object from database');
    return reconstructedSchedule;
};

/**
 * Load the complete application state including all reconstructed Schedule objects.
 * Calls user profile, preferences, and all schedule APIs in parallel where possible.
 */
export const loadCompleteAppStateWithSchedules = async (makeAuthenticatedRequest) => {
    // Load user profile, preferences, and schedule list in parallel
    const [userProfile, preferences, schedules] = await Promise.all([
        makeAuthenticatedRequest('/api/users/profile'),
        makeAuthenticatedRequest('/api/preferences'),
        makeAuthenticatedRequest('/api/schedules'),
    ]);

    const basicAppState = {
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
            nickname: preferences.data.nickname || '',
        },
        savedSchedules: schedules.data.map((schedule) => ({
            name: schedule.title,
            backendId: schedule.id,
            schedule: null,
            isActive: Boolean(schedule.isActive || false),
        })),
        activeSchedule: schedules.data.find((s) => s.isActive)
            ? {
                  name: schedules.data.find((s) => s.isActive).title,
                  backendId: schedules.data.find((s) => s.isActive).id,
                  schedule: null,
                  isActive: true,
              }
            : null,
    };

    // Load and reconstruct Schedule objects in parallel
    const schedulePromises = basicAppState.savedSchedules
        .filter((s) => s.backendId)
        .map(async (savedSchedule) => {
            try {
                const scheduleData = await makeAuthenticatedRequest(
                    `/api/schedules/${savedSchedule.backendId}?includeBlocks=true`,
                );

                if (!scheduleData.success || !scheduleData.data) {
                    throw new Error('Failed to fetch schedule data from database');
                }

                const schedule = scheduleData.data;

                // Fetch dependencies (non-fatal)
                let dependenciesMap = null;
                try {
                    const dependenciesResponse = await makeAuthenticatedRequest(
                        `/api/schedules/${savedSchedule.backendId}/dependencies`,
                    );
                    if (dependenciesResponse.success && dependenciesResponse.data) {
                        dependenciesMap = dependenciesResponse.data.dependenciesMap;
                    }
                } catch (depError) {
                    console.warn(
                        'Failed to retrieve dependencies for schedule:',
                        savedSchedule.backendId,
                        depError,
                    );
                }

                const serializedSchedule = {
                    numDays: schedule.numDays,
                    day1Date: schedule.day1Date,
                    day1Day: schedule.day1Day,
                    minGap: schedule.minGap,
                    workingHoursLimit: schedule.workingHoursLimit,
                    strategy: schedule.strategy,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    eventDependencies: dependenciesMap || {},
                    schedule: [],
                    parseFromBackend: true,
                };

                const blocksByDate = {};
                schedule.blocks.forEach((block) => {
                    const dateKey = block.blockDate;
                    if (!blocksByDate[dateKey]) blocksByDate[dateKey] = [];

                    blocksByDate[dateKey].push({
                        name: block.title,
                        date: block.dateObject || {
                            date: parseInt(block.blockDate.split('-')[2]),
                            month: parseInt(block.blockDate.split('-')[1]),
                            year: parseInt(block.blockDate.split('-')[0]),
                        },
                        activityType: block.category,
                        priority: block.priority,
                        startTime: block.startAt,
                        endTime: block.endAt,
                        duration: block.duration,
                        completed: block.completed,
                        deadline:
                            block.deadlineObject || block.deadline
                                ? {
                                      date: parseInt(block.deadline?.split('-')[2] || 1),
                                      month: parseInt(block.deadline?.split('-')[1] || 1),
                                      year: parseInt(block.deadline?.split('-')[0] || 2025),
                                  }
                                : null,
                        type: block.type,
                        backendId: block.id,
                    });
                });

                serializedSchedule.schedule = Object.entries(blocksByDate).map(
                    ([dateKey, dayBlocks]) => {
                        const dateObject = {
                            date: parseInt(dateKey.split('-')[2]),
                            month: parseInt(dateKey.split('-')[1]),
                            year: parseInt(dateKey.split('-')[0]),
                        };
                        const reverseDateKey = `${String(dateObject.date)}-${String(dateObject.month)}-${String(dateObject.year)}`;

                        return [
                            reverseDateKey,
                            {
                                day: 'Monday',
                                date: dateObject,
                                minGap: schedule.minGap,
                                workingHoursLimit: schedule.workingHoursLimit,
                                events: [],
                                breaks: [],
                                timeBlocks: dayBlocks,
                            },
                        ];
                    },
                );

                const scheduleObject = parseSchedule(serializedSchedule);
                return { ...savedSchedule, schedule: scheduleObject };
            } catch (error) {
                console.warn(`Failed to load schedule ${savedSchedule.name}:`, error);
                return savedSchedule;
            }
        });

    const reconstructedSchedules = await Promise.all(schedulePromises);

    console.log('✅ Loaded complete app state with reconstructed Schedule objects');
    return {
        ...basicAppState,
        savedSchedules: reconstructedSchedules,
        activeSchedule: reconstructedSchedules.find((s) => s.isActive) || null,
    };
};

/**
 * Standalone helper to load a single Schedule object by ID (legacy path).
 * Used when only a single schedule object is needed by ID.
 */
export const loadScheduleObjectById = async (makeAuthenticatedRequest, scheduleId) => {
    const scheduleData = await makeAuthenticatedRequest(
        `/api/schedules/${scheduleId}?includeBlocks=true`,
    );

    if (!scheduleData.success || !scheduleData.data) {
        throw new Error('Failed to fetch schedule data from database');
    }

    const { schedule, blocks } = scheduleData.data;

    let dependenciesMap = null;
    try {
        const dependenciesResponse = await makeAuthenticatedRequest(
            `/api/schedules/${scheduleId}/dependencies`,
        );
        if (dependenciesResponse.success && dependenciesResponse.data) {
            dependenciesMap = dependenciesResponse.data.dependenciesMap;
        }
    } catch (depError) {
        console.warn('Failed to retrieve dependencies for schedule:', scheduleId, depError);
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
        eventDependencies: dependenciesMap || {},
        schedule: [],
        parseFromBackend: true,
    };

    const blocksByDate = {};
    blocks.forEach((block) => {
        const dateKey = block.blockDate;
        if (!blocksByDate[dateKey]) blocksByDate[dateKey] = [];

        blocksByDate[dateKey].push({
            name: block.title,
            date: block.dateObject || {
                date: parseInt(block.blockDate.split('-')[2]),
                month: parseInt(block.blockDate.split('-')[1]),
                year: parseInt(block.blockDate.split('-')[0]),
            },
            activityType: block.category,
            priority: block.priority,
            startTime: { hour: Math.floor(block.startAt / 100), minute: block.startAt % 100 },
            endTime: { hour: Math.floor(block.endAt / 100), minute: block.endAt % 100 },
            duration: block.duration,
            completed: block.completed,
            deadline:
                block.deadlineObject || block.deadline
                    ? {
                          date: parseInt(block.deadline?.split('-')[2] || 1),
                          month: parseInt(block.deadline?.split('-')[1] || 1),
                          year: parseInt(block.deadline?.split('-')[0] || 2025),
                      }
                    : null,
            type: block.type,
            backendId: block.id,
        });
    });

    serializedSchedule.schedule = Object.entries(blocksByDate).map(([dateKey, dayBlocks]) => {
        const dateObject = {
            date: parseInt(dateKey.split('-')[2]),
            month: parseInt(dateKey.split('-')[1]),
            year: parseInt(dateKey.split('-')[0]),
        };

        return [
            dateKey,
            {
                day: 'Monday',
                date: dateObject,
                minGap: schedule.minGap,
                workingHoursLimit: schedule.workingHoursLimit,
                events: [],
                breaks: [],
                timeBlocks: dayBlocks,
            },
        ];
    });

    const reconstructedSchedule = parseSchedule(serializedSchedule);
    if (!reconstructedSchedule) {
        throw new Error('Failed to parse reconstructed schedule');
    }

    return reconstructedSchedule;
};
