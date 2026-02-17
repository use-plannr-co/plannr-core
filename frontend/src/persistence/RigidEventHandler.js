import RigidEvent from '../model/RigidEvent.js';
import { serializeScheduleDate, parseScheduleDate } from './ScheduleDateHandler.js';
import { serializeActivityType, parseActivityType } from './ActivityTypeHandler.js';
import { serializeTime24, parseTime24 } from './Time24Handler.js';

export const serializeRigidEvent = (eventObj) => {
    if (!eventObj) return null;

    return {
        name: eventObj.name,
        type: serializeActivityType(eventObj.type),
        duration: eventObj.duration,
        date: serializeScheduleDate(eventObj.date),
        startTime: serializeTime24(eventObj.startTime),
        endTime: serializeTime24(eventObj.endTime),
        id: eventObj.id,
    };
};

export const parseRigidEvent = (rawObj) => {
    if (
        !rawObj ||
        rawObj.name == null ||
        rawObj.type == null ||
        rawObj.duration == null ||
        rawObj.startTime == null ||
        rawObj.endTime == null ||
        rawObj.date == null
    ) {
        return null;
    }

    return new RigidEvent(
        rawObj.name,
        parseActivityType(rawObj.type),
        rawObj.duration,
        parseScheduleDate(rawObj.date),
        parseTime24(rawObj.startTime),
        parseTime24(rawObj.endTime),
        rawObj.id,
    );
};
