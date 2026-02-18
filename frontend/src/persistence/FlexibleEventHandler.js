import FlexibleEvent from '../model/FlexibleEvent.js';
import { serializeScheduleDate, parseScheduleDate } from './ScheduleDateHandler.js';
import { serializeActivityType, parseActivityType } from './ActivityTypeHandler.js';
import { serializePriority, parsePriority } from './PriorityHandler.js';

export const serializeFlexibleEvent = (eventObj) => {
    if (!eventObj) return null;

    return {
        name: eventObj.name,
        type: serializeActivityType(eventObj.type),
        duration: eventObj.duration,
        priority: serializePriority(eventObj.priority),
        deadline: serializeScheduleDate(eventObj.deadline),
        id: eventObj.id,
    };
};

export const parseFlexibleEvent = (rawObj) => {
    if (!rawObj || rawObj.name == null || rawObj.duration == null) {
        return null;
    }

    return new FlexibleEvent(
        rawObj.name,
        parseActivityType(rawObj.type),
        rawObj.duration,
        parsePriority(rawObj.priority),
        parseScheduleDate(rawObj.deadline),
        rawObj.id,
    );
};
