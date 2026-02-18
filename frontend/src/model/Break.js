import Time24 from './Time24.js';

/**
 * Represents a break in the schedule.
 */
class Break {
    /**
     * @param {number} duration - The duration of the break in minutes
     * @param {number} startTime - The start time of the break in 24-hour format (numeric)
     * @param {number} endTime - The end time of the break in 24-hour format (numeric)
     * EFFECTS: creates a new break with the given duration
     */
    constructor(duration, startTime, endTime) {
        this.duration = duration;
        this.startTime = new Time24(startTime);
        this.endTime = new Time24(endTime);
    }

    /** @returns {number} the duration of the break */
    getDuration() {
        return this.duration;
    }

    /** @returns {Time24} the start time of the break */
    getStartTime() {
        return this.startTime;
    }

    /** @returns {Time24} the end time of the break */
    getEndTime() {
        return this.endTime;
    }

    /**
     * Compares this break with another for equality
     * @param {any} other
     * @returns {boolean} true if same duration, startTime, and endTime
     */
    equals(other) {
        return (
            other instanceof Break &&
            this.duration === other.duration &&
            this.startTime.equals(other.startTime) &&
            this.endTime.equals(other.endTime)
        );
    }
}

export default Break;
