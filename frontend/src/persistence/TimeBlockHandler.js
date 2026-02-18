import TimeBlock from '../model/TimeBlock.js';

import { serializeScheduleDate, parseScheduleDate } from './ScheduleDateHandler.js';
import { serializeActivityType, parseActivityType } from './ActivityTypeHandler.js';
import { serializeTime24, parseTime24 } from './Time24Handler.js';
import { serializePriority, parsePriority } from './PriorityHandler.js';
import FlexibleEvent from '../model/FlexibleEvent.js';
import RigidEvent from '../model/RigidEvent.js';
import Break from '../model/Break.js';

export const serializeTimeBlock = (timeBlock) => {
    if (!timeBlock) return null;

    return {
        name: timeBlock.name,
        date: serializeScheduleDate(timeBlock.date),
        activityType: serializeActivityType(timeBlock.activityType),
        priority: serializePriority(timeBlock.priority),
        startTime: serializeTime24(timeBlock.startTime),
        endTime: serializeTime24(timeBlock.endTime),
        duration: timeBlock.duration,
        completed: timeBlock.completed,
        deadline: serializeScheduleDate(timeBlock.deadline),
        type: timeBlock.type,
        backendId: timeBlock.backendId || null,
    };
};

export const parseTimeBlock = (rawObj) => {
    if (
        !rawObj ||
        rawObj.name == null ||
        rawObj.date == null ||
        rawObj.startTime == null ||
        rawObj.endTime == null ||
        rawObj.duration == null ||
        rawObj.type == null
    ) {
        return null;
    }

    const isCompleted = rawObj.completed;

    if (rawObj.type === 'flexible') {
        const event = new FlexibleEvent(
            rawObj.name,
            parseActivityType(rawObj.activityType),
            rawObj.duration,
            parsePriority(rawObj.priority),
            parseScheduleDate(rawObj.deadline),
        );
        return TimeBlock.fromFlexibleEvent(
            event,
            parseScheduleDate(rawObj.date),
            parseTime24(rawObj.startTime).toInt(),
            parseTime24(rawObj.endTime).toInt(),
            isCompleted,
            rawObj.backendId || null,
        );
    } else if (rawObj.type === 'rigid') {
        const event = new RigidEvent(
            rawObj.name,
            parseActivityType(rawObj.activityType),
            rawObj.duration,
            parseScheduleDate(rawObj.date),
            parseTime24(rawObj.startTime).toInt(),
            parseTime24(rawObj.endTime).toInt(),
        );
        return TimeBlock.fromRigidEvent(event, isCompleted, rawObj.backendId || null);
    } else if (rawObj.type === 'break') {
        const breakObj = new Break(
            rawObj.duration,
            parseTime24(rawObj.startTime).toInt(),
            parseTime24(rawObj.endTime).toInt(),
        );
        return TimeBlock.fromBreak(
            breakObj,
            parseScheduleDate(rawObj.date),
            isCompleted,
            rawObj.backendId || null,
        );
    }
};
