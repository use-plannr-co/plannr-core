import Schedule from '../model/Schedule.js';
import { serializeTime24, parseTime24 } from './Time24Handler.js';
import { serializeScheduleDate, parseScheduleDate } from './ScheduleDateHandler.js';
import { serializeDaySchedule, parseDaySchedule } from './DayHandler.js';
import { serializeEventDependencies, parseEventDependencies } from './EventDependenciesHandler.js';
import EventDependencies from '../model/EventDependencies.js';

export const serializeSchedule = (schedule) => {
    if (!schedule) return null;

    let datesList = [];
    for (const date of schedule.getAllDatesInOrder()) {
        datesList.push([date, serializeDaySchedule(schedule.getScheduleForDate(date))]);
    }

    return {
        numDays: schedule.numDays,
        day1Date: serializeScheduleDate(schedule.day1Date),
        day1Day: schedule.day1Day,
        minGap: schedule.minGap,
        workingHoursLimit: schedule.workingHoursLimit,
        eventDependencies: serializeEventDependencies(schedule.eventDependencies),
        schedule: datesList,
        strategy: schedule.strategy,
        startTime: serializeTime24(schedule.startTime),
        endTime: serializeTime24(schedule.endTime),
    };
};

export const parseSchedule = (rawObj, parsingFromBackend = false) => {
    if (!rawObj) return null;

    if (parsingFromBackend) {
        return parseScheduleFromBackend(rawObj);
    } else {
        return parseScheduleFromFrontend(rawObj);
    }
};

/**
 * Parse schedule from backend response (with dependency reconstruction)
 */
const parseScheduleFromBackend = (rawObj) => {
    if (!rawObj || !rawObj.schedule) {
        console.warn('Backend schedule missing required fields:', rawObj);
        return null;
    }

    const scheduleData = rawObj.schedule;

    // Validate required fields
    if (!scheduleData.day1Date || !scheduleData.schedule) {
        console.warn('Backend schedule missing required fields:', scheduleData);
        return null;
    }

    // Parse schedule map first to collect events
    const scheduleMap = new Map();
    const allEvents = [];

    for (const [date, rawDaySchedule] of scheduleData.schedule) {
        const parsedDay = parseDaySchedule(rawDaySchedule);
        if (parsedDay) {
            scheduleMap.set(date, parsedDay);
            // Collect all events from this day
            allEvents.push(...parsedDay.events);
        }
    }

    // Parse event dependencies using name-based matching
    let eventDependencies = null;
    if (rawObj.eventDependencies && rawObj.eventDependencies.dependenciesMap) {
        eventDependencies = parseEventDependenciesFromNames(
            rawObj.eventDependencies.dependenciesMap,
            allEvents,
        );
    }

    // Create schedule object with all the required parameters
    const schedule = new Schedule(
        scheduleData.numDays,
        scheduleData.minGap,
        parseScheduleDate(scheduleData.day1Date),
        scheduleData.day1Day,
        scheduleData.workingHoursLimit,
        eventDependencies,
        scheduleMap,
        scheduleData.strategy,
        parseTime24(scheduleData.startTime),
        parseTime24(scheduleData.endTime),
    );

    return schedule;
};

/**
 * Parse schedule from frontend data (original logic)
 */
const parseScheduleFromFrontend = (rawObj) => {
    if (
        !rawObj ||
        rawObj.day1Date == null ||
        rawObj.eventDependencies == null ||
        rawObj.schedule == null
    ) {
        return null;
    }

    let schedule = new Map();
    for (const [date, rawDaySchedule] of rawObj.schedule) {
        const parsedDay = parseDaySchedule(rawDaySchedule);
        if (!parsedDay) {
            continue;
        }
        schedule.set(date, parsedDay);
    }

    const numDays = rawObj.numDays;
    const minGap = rawObj.minGap;
    const workingHoursLimit = rawObj.workingHoursLimit;
    const day1Day = rawObj.day1Day;
    const strategy = rawObj.strategy;

    let scheduleToReturn = new Schedule(
        numDays,
        minGap,
        parseScheduleDate(rawObj.day1Date),
        day1Day,
        workingHoursLimit,
        parseEventDependencies(rawObj.eventDependencies),
        schedule,
        strategy,
        parseTime24(rawObj.startTime),
        parseTime24(rawObj.endTime),
    );

    return scheduleToReturn;
};

/**
 * Parse event dependencies from name-based map to object-based map
 * This occurs after the schedule date:daySchedule map has been fully parsed
 */
export const parseEventDependenciesFromNames = (dependenciesMap, allEvents) => {
    if (!dependenciesMap || typeof dependenciesMap !== 'object') {
        console.warn('Invalid dependencies map provided:', dependenciesMap);
        return null;
    }

    if (!allEvents || allEvents.length === 0) {
        console.warn('No events provided for dependency matching');
        return null;
    }

    // Create name-to-event lookup map (case-insensitive)
    const eventsByName = new Map();
    allEvents.forEach((event) => {
        if (event && event.name) {
            const normalizedName = event.name.trim().toLowerCase();
            eventsByName.set(normalizedName, event);
        }
    });

    // Create EventDependencies object using the proper constructor and methods
    const eventDependencies = new EventDependencies();
    let matchedCount = 0;
    let totalCount = 0;

    for (const [eventName, dependencyNames] of Object.entries(dependenciesMap)) {
        totalCount++;

        // Find the event object for this name
        const normalizedEventName = eventName.trim().toLowerCase();
        const event = eventsByName.get(normalizedEventName);

        if (!event) {
            console.warn(`Event not found for dependency mapping: "${eventName}"`);
            continue;
        }

        // Add each dependency using the EventDependencies.addDependency method
        let eventMatchedDeps = 0;
        for (const depName of dependencyNames) {
            if (typeof depName === 'string') {
                const normalizedDepName = depName.trim().toLowerCase();
                const depEvent = eventsByName.get(normalizedDepName);
                if (depEvent) {
                    try {
                        eventDependencies.addDependency(event, depEvent);
                        eventMatchedDeps++;
                    } catch (error) {
                        console.error(
                            `Failed to add dependency "${depName}" to event "${eventName}":`,
                            error.message,
                        );
                        // Continue with other dependencies even if one fails (e.g., circular dependency)
                    }
                } else {
                    console.warn(
                        `Dependency event not found: "${depName}" for event "${eventName}"`,
                    );
                }
            }
        }

        if (eventMatchedDeps > 0) {
            matchedCount++;
        }
    }

    console.log(`Dependency reconstruction: ${matchedCount}/${totalCount} events matched`);

    // Return the EventDependencies object (even if empty, let the caller decide)
    return eventDependencies;
};

/**
 * Convert EventDependencies object to name-based map for database storage
 */
export const convertEventDependenciesToNameMap = (eventDependencies) => {
    const nameMap = {};

    if (eventDependencies && eventDependencies.getDependencies) {
        try {
            const depMap = eventDependencies.getDependencies();

            for (const [event, dependencies] of depMap.entries()) {
                if (event && event.name) {
                    const eventName = event.name;
                    const dependencyNames = dependencies
                        .filter((dep) => dep && dep.name)
                        .map((dep) => dep.name);
                    nameMap[eventName] = dependencyNames;
                }
            }
        } catch (error) {
            console.error('Error converting event dependencies to name map:', error);
        }
    }

    return nameMap;
};
