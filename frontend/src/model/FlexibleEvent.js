import Event from './Event.js';
import ActivityType from './ActivityType.js';
import ScheduleDate from './ScheduleDate.js';
import Priority from './Priority.js';
import generateId from '../utils/uuid.js';

/**
 * Represents a flexible event that has no fixed time, but instead a priority and a deadline.
 */
class FlexibleEvent extends Event {
    /**
     * @param {string} name - The name of the event
     * @param {string} type - The type of activity (from ActivityType)
     * @param {number} duration - Duration in minutes
     * @param {string} priority - Priority of the event (from Priority enum)
     * @param {ScheduleDate} deadline - The deadline date
     */
    constructor(name, type, duration, priority, deadline, id = '') {
        super(name, type, duration);
        this.priority = priority;
        this.deadline = deadline;
        this.id = id == '' ? generateId(name, 'flex') : id;
    }

    /** @returns {ScheduleDate} the deadline of the event */
    getDeadline() {
        return this.deadline;
    }

    /** @returns {string} the priority of the event */
    getPriority() {
        return this.priority;
    }

    /** @returns {string} the id of the event */
    getId() {
        return this.id;
    }
}

export default FlexibleEvent;
