import ActivityType from './ActivityType.js';

/**
 * Represents an event or task to be scheduled in the calendar.
 * Abstract base class.
 */
class Event {
    /**
     * @param {string} name - The name of the event
     * @param {string} type - The activity type (from ActivityType)
     * @param {number} duration - The duration of the event in minutes
     */
    constructor(name, type, duration) {
        if (new.target === Event) {
            throw new Error('Cannot instantiate abstract class Event directly.');
        }

        this.name = name;
        this.type = type;
        this.duration = duration;
    }

    /** @returns {string} the name of the event */
    getName() {
        return this.name;
    }

    /** @returns {string} the activity type of the event */
    getType() {
        return this.type;
    }

    /** @returns {number} the duration of the event in minutes */
    getDuration() {
        return this.duration;
    }

    /** @returns {string} a string representation of the event */
    toString() {
        return `${this.name} (${this.type})`;
    }

    /**
     * Checks equality with another event
     * @param {any} other
     * @returns {boolean}
     */
    equals(other) {
        return (
            other instanceof Event &&
            this.name === other.name &&
            this.type === other.type &&
            this.duration === other.duration
        );
    }
}

export default Event;
