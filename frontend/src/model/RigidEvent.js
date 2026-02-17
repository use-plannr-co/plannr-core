import Event from './Event.js';
import Time24 from './Time24.js';
import ActivityType from './ActivityType.js';
import ScheduleDate from './ScheduleDate.js';
import generateId from '../utils/uuid.js';

/**
 * Represents a rigid event that has a fixed date and time of occurrence.
 */
class RigidEvent extends Event {
    /**
     * @param {string} name - The name of the event
     * @param {string} type - The activity type of the event (from ActivityType)
     * @param {number} duration - The duration of the event in minutes
     * @param {ScheduleDate} date - The date of the event
     * @param {number} startTime - The start time in 24-hour integer format (e.g., 930)
     * @param {number} endTime - The end time in 24-hour integer format (e.g., 1045)
     */
    constructor(name, type, duration, date, startTime, endTime, id = '') {
        super(name, type, duration);
        this.date = date;
        this.startTime = new Time24(startTime);
        this.endTime = new Time24(endTime);
        this.id = id == '' ? generateId(name, 'rigid') : id;
    }

    /** @returns {ScheduleDate} the date of the event */
    getDate() {
        return this.date;
    }

    /** @returns {Time24} the start time */
    getStartTime() {
        return this.startTime;
    }

    /** @returns {Time24} the end time */
    getEndTime() {
        return this.endTime;
    }

    /** @returns {string} the id of the event */
    getId() {
        return this.id;
    }
}

export default RigidEvent;
