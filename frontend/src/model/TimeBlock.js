import Time24 from './Time24.js';
import ActivityType from './ActivityType.js';
import Priority from './Priority.js';

/**
 * Represents a block of time in a schedule.
 * Can be a rigid event, flexible event, or break.
 */
class TimeBlock {
    /**
     * Constructs a TimeBlock from a RigidEvent.
     * @param {RigidEvent} event
     */
    constructor(
        name,
        type,
        duration,
        date,
        startTime,
        endTime,
        activityType,
        priority,
        deadline,
        isCompleted,
        backendId = null,
    ) {
        this.name = name;
        this.type = type; // "rigid", "flexible", "break"
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.duration = duration;
        this.activityType = activityType;
        this.priority = priority;
        this.deadline = deadline;
        this.completed = isCompleted;
        this.backendId = backendId; // Backend database ID for syncing
    }

    /** @returns {string} name of the time block */
    getName() {
        return this.name;
    }

    /** @returns {ScheduleDate} date of the time block */
    getDate() {
        return this.date;
    }

    /** @returns {string|undefined} activity type (undefined for breaks) */
    getActivityType() {
        return this.activityType;
    }

    /** @returns {Time24} start time */
    getStartTime() {
        return this.startTime;
    }

    /** @returns {Time24} end time */
    getEndTime() {
        return this.endTime;
    }

    /** @returns {string} the type of time block: 'rigid', 'flexible', or 'break' */
    getType() {
        return this.type;
    }

    /** @returns {number} duration of the time block */
    getDuration() {
        return this.duration;
    }

    /** @returns {Priority} priority of the time block */
    getPriority() {
        return this.priority;
    }

    /** @returns {ScheduleDate} deadline of the time block */
    getDeadline() {
        return this.deadline;
    }

    /** @returns {boolean} true if completed */
    isCompleted() {
        return this.completed;
    }

    /** @returns {string|null} backend database ID */
    getBackendId() {
        return this.backendId;
    }

    /**
     * Sets the backend ID for this time block.
     * @param {string|null} backendId
     */
    setBackendId(backendId) {
        this.backendId = backendId;
    }

    /**
     * Sets the completion status of this time block.
     * @param {boolean} completed
     */
    setCompleted(completed) {
        this.completed = completed;
    }

    /**
     * @param {any} other
     * @returns {boolean} true if other block is equal to this one
     */
    equals(other) {
        return (
            other instanceof TimeBlock &&
            this.name === other.getName() &&
            this.date.equals(other.getDate()) &&
            this.startTime.equals(other.getStartTime()) &&
            this.endTime.equals(other.getEndTime()) &&
            this.duration === other.getDuration() &&
            this.type === other.getType() &&
            this.activityType === other.getActivityType() &&
            this.priority === other.getPriority() &&
            this.deadline.equals(other.getDeadline()) &&
            this.completed === other.isCompleted()
        );
    }

    /**
     * @returns {string} human-readable summary
     */
    toString() {
        let result = `${this.startTime.toString()} - ${this.endTime.toString()}: ${this.name}`;
        if (this.type === 'break') {
            return result;
        }
        result += ` (${this.activityType})`;
        return result;
    }

    /**
     * Generates a UID for this block.
     * @returns {string} a unique identifier for the block
     */
    getUID() {
        const uid = `${this.date.toString()}-${this.startTime.toString()}-${this.name.replace(/\s+/g, '_')}`;
        return `${uid}@plannr.scheduler`.toLowerCase();
    }

    static fromRigidEvent(event, isCompleted = false, backendId = null) {
        return new TimeBlock(
            event.getName(),
            'rigid',
            event.getDuration(),
            event.getDate(),
            event.getStartTime(),
            event.getEndTime(),
            event.getType(),
            Priority.HIGH,
            event.getDate(),
            isCompleted,
            backendId,
        );
    }

    static fromFlexibleEvent(
        event,
        date,
        startTime,
        endTime,
        isCompleted = false,
        backendId = null,
    ) {
        return new TimeBlock(
            event.getName(),
            'flexible',
            event.getDuration(),
            date,
            new Time24(startTime),
            new Time24(endTime),
            event.getType(),
            event.getPriority(),
            event.getDeadline(),
            isCompleted,
            backendId,
        );
    }

    static fromBreak(breakObj, date, isCompleted = false, backendId = null) {
        return new TimeBlock(
            'Break',
            'break',
            breakObj.getDuration(),
            date,
            breakObj.getStartTime(),
            breakObj.getEndTime(),
            ActivityType.BREAK,
            Priority.LOW,
            date,
            isCompleted,
            backendId,
        );
    }
}

export default TimeBlock;
