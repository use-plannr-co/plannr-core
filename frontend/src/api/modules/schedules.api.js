import { serializeScheduleDate } from '../../persistence/ScheduleDateHandler';
import { serializeTimeBlock } from '../../persistence/TimeBlockHandler';
import { convertEventDependenciesToNameMap } from '../../persistence/ScheduleHandler';
import ScheduleDate from '../../model/ScheduleDate';

/**
 * Schedules API module
 * Plain functions — receive makeAuthenticatedRequest as first argument.
 */

export const getSchedules = (makeAuthenticatedRequest) =>
    makeAuthenticatedRequest('/api/schedules');

export const createSchedule = (makeAuthenticatedRequest, data) =>
    makeAuthenticatedRequest('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getScheduleById = (makeAuthenticatedRequest, id, includeBlocks = true) =>
    makeAuthenticatedRequest(`/api/schedules/${id}?includeBlocks=${includeBlocks}`);

export const updateSchedule = (makeAuthenticatedRequest, id, data) =>
    makeAuthenticatedRequest(`/api/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteSchedule = (makeAuthenticatedRequest, id) =>
    makeAuthenticatedRequest(`/api/schedules/${id}`, {
        method: 'DELETE',
    });

/**
 * Save a complete schedule with all its days and blocks to the backend.
 * Handles schedule creation, day creation, block creation, and dependencies.
 */
export const saveScheduleWithDays = async (
    makeAuthenticatedRequest,
    scheduleObject,
    scheduleName,
    strategy = 'earliest-fit',
    startTime = 900,
    endTime = 1700
) => {
    try {
        const scheduleData = {
            title: scheduleName,
            numDays: scheduleObject.numDays,
            day1Date: scheduleObject.day1Date,
            day1Day: scheduleObject.day1Day,
            minGap: scheduleObject.minGap,
            workingHoursLimit: scheduleObject.workingHoursLimit,
            strategy,
            startTime,
            endTime,
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

        const datesList = scheduleObject.getAllDatesInOrder();
        const createdDays = [];

        const parseScheduleDateId = (dateId) => {
            const parts = dateId.split('-');
            return new ScheduleDate(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
        };

        for (let i = 0; i < datesList.length; i++) {
            const dateId = datesList[i];
            const date = parseScheduleDateId(dateId);
            const daySchedule = scheduleObject.getScheduleForDate(dateId);

            const dayData = {
                dayNumber: i + 1,
                dayName: daySchedule.day,
                date: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.date).padStart(2, '0')}`,
                dateObject: serializeScheduleDate(date),
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

            const dayResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days`, {
                method: 'POST',
                body: JSON.stringify(dayData),
            });

            if (!dayResponse.success) {
                throw new Error(`Failed to create day ${i + 1}: ${dayResponse.message}`);
            }

            const dayId = dayResponse.data.id;
            createdDays.push({ id: dayId, date, daySchedule });
            console.log(`✅ Created day ${i + 1} (${daySchedule.day}):`, dayId);

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
                        dateObject: serializeScheduleDate(date),
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
                });

                const blocksResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/days/${dayId}/blocks`, {
                    method: 'POST',
                    body: JSON.stringify({ blocks: blocksData }),
                });

                if (!blocksResponse.success) {
                    throw new Error(`Failed to add blocks to day ${i + 1}: ${blocksResponse.message}`);
                }

                const createdBlocks = blocksResponse.data || [];
                timeBlocks.forEach((frontendBlock, blockIndex) => {
                    if (createdBlocks[blockIndex] && createdBlocks[blockIndex].id) {
                        frontendBlock.setBackendId(createdBlocks[blockIndex].id);
                    }
                });

                console.log(`✅ Added ${blocksData.length} blocks to day ${i + 1}`);
            }
        }

        // Save event dependencies if they exist
        let savedDependencies = null;
        if (scheduleObject.events && scheduleObject.events.length > 0 && convertEventDependenciesToNameMap) {
            try {
                const dependenciesMap = convertEventDependenciesToNameMap(scheduleObject.events);
                if (dependenciesMap && Object.keys(dependenciesMap).length > 0) {
                    const dependenciesResponse = await makeAuthenticatedRequest(`/api/schedules/${scheduleId}/dependencies`, {
                        method: 'POST',
                        body: JSON.stringify({ dependenciesMap }),
                    });
                    if (dependenciesResponse.success) {
                        savedDependencies = dependenciesResponse.data;
                    } else {
                        console.warn('⚠️ Failed to save dependencies, but continuing:', dependenciesResponse.message);
                    }
                }
            } catch (depError) {
                console.warn('⚠️ Failed to save dependencies, but continuing:', depError);
            }
        }

        console.log('✅ Successfully saved schedule with days-based architecture');
        return {
            scheduleId,
            daysCreated: createdDays.length,
            dependenciesSaved: !!savedDependencies,
            updatedScheduleObject: scheduleObject,
            success: true
        };

    } catch (error) {
        console.error('❌ Failed to save schedule with days:', error);
        throw error;
    }
};

/**
 * Convert a Schedule object to the days/blocks API format (without persisting).
 */
export const convertScheduleToAPIFormat = (scheduleObject) => {
    try {
        const datesList = scheduleObject.getAllDatesInOrder();
        const daysData = [];

        for (let i = 0; i < datesList.length; i++) {
            const date = datesList[i];
            const daySchedule = scheduleObject.getScheduleForDate(date);
            const timeBlocks = daySchedule.getTimeBlocks();

            daysData.push({
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
            });
        }

        return daysData;
    } catch (error) {
        console.error('Failed to convert schedule to API format:', error);
        throw error;
    }
};
