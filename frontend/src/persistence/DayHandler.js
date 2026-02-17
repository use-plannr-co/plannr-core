import Day from '../model/Day.js';

import { serializeScheduleDate, parseScheduleDate } from './ScheduleDateHandler.js';
import { serializeBreak, parseBreak } from './BreakHandler.js';
import { serializeFlexibleEvent, parseFlexibleEvent } from './FlexibleEventHandler.js';
import { serializeRigidEvent, parseRigidEvent } from './RigidEventHandler.js';
import { serializeTimeBlock, parseTimeBlock } from './TimeBlockHandler.js';
import FlexibleEvent from '../model/FlexibleEvent.js';
import RigidEvent from '../model/RigidEvent.js';
import Break from '../model/Break.js';

export const serializeDaySchedule = (daySchedule) => {
    if (!daySchedule) return null;

    let eventsList = [];
    for (let i = 0; i < daySchedule.events.length; i++) {
        if (daySchedule.events[i] instanceof FlexibleEvent) {
            eventsList.push(serializeFlexibleEvent(daySchedule.events[i]));
        } else if (daySchedule.events[i] instanceof RigidEvent) {
            eventsList.push(serializeRigidEvent(daySchedule.events[i]));
        }
    }

    let breaksList = [];
    for (let i = 0; i < daySchedule.breaks.length; i++) {
        breaksList.push(serializeBreak(daySchedule.breaks[i]));
    }

    let timeBlocksList = [];
    for (let i = 0; i < daySchedule.timeBlocks.length; i++) {
        timeBlocksList.push(serializeTimeBlock(daySchedule.timeBlocks[i]));
    }

    return {
        day: daySchedule.day,
        date: serializeScheduleDate(daySchedule.date),
        minGap: daySchedule.minGap,
        workingHoursLimit: daySchedule.workingHoursLimit,
        events: eventsList,
        breaks: breaksList,
        timeBlocks: timeBlocksList,
    };
};

export const parseDaySchedule = (rawObj) => {
    if (
        !rawObj ||
        rawObj.day == null ||
        rawObj.date == null ||
        rawObj.minGap == null ||
        rawObj.workingHoursLimit == null ||
        rawObj.events == null ||
        rawObj.breaks == null ||
        rawObj.timeBlocks == null
    ) {
        console.warn('DaySchedule missing required fields:', rawObj);
        return null;
    }

    let eventsList = [];
    let breaksList = [];

    if (
        rawObj.events.length === 0 &&
        rawObj.breaks.length === 0 &&
        rawObj.timeBlocks.length !== 0
    ) {
        for (const timeBlock of rawObj.timeBlocks) {
            if (timeBlock.type === 'rigid') {
                eventsList.push(
                    new RigidEvent(
                        timeBlock.name,
                        timeBlock.activityType,
                        timeBlock.duration,
                        parseScheduleDate(timeBlock.date),
                        timeBlock.startTime,
                        timeBlock.endTime,
                        timeBlock.backendId || '',
                    ),
                );
            } else if (timeBlock.type === 'flexible') {
                eventsList.push(
                    new FlexibleEvent(
                        timeBlock.name,
                        timeBlock.activityType,
                        timeBlock.duration,
                        timeBlock.priority,
                        parseScheduleDate(timeBlock.deadline),
                        timeBlock.backendId || '',
                    ),
                );
            } else if (timeBlock.type === 'break') {
                breaksList.push(
                    new Break(timeBlock.duration, timeBlock.startTime, timeBlock.endTime),
                );
            }
        }
    } else {
        for (const event of rawObj.events) {
            let parsed = null;
            if (event.deadline != null) {
                parsed = parseFlexibleEvent(event);
            } else if (event.date != null && event.startTime != null && event.endTime != null) {
                parsed = parseRigidEvent(event);
            }

            eventsList.push(parsed);
        }

        for (let i = 0; i < rawObj.breaks.length; i++) {
            breaksList.push(parseBreak(rawObj.breaks[i]));
        }
    }

    let timeBlocksList = [];
    for (let i = 0; i < rawObj.timeBlocks.length; i++) {
        timeBlocksList.push(parseTimeBlock(rawObj.timeBlocks[i]));
    }

    return new Day(
        rawObj.day,
        parseScheduleDate(rawObj.date),
        rawObj.minGap,
        rawObj.workingHoursLimit,
        eventsList,
        breaksList,
        timeBlocksList,
    );
};
