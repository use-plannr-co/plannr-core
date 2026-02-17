import ActivityType from './ActivityType.js';
import ScheduleDate from './ScheduleDate.js';
import TimeBlock from './TimeBlock.js';
import Time24 from './Time24.js';
import RigidEvent from './RigidEvent.js';
import FlexibleEvent from './FlexibleEvent.js';
import EventConflictError from './exceptions/EventConflictError.js';
import WorkingLimitExceededError from './exceptions/WorkingLimitExceededError.js';

/**
 * Represents a schedule for a single day.
 */
class Day {
    /**
     * @param {string} day - Day of the week (e.g. "Monday", "Tuesday", ...)
     * @param {ScheduleDate} date - The date for this day
     * @param {number} minGap - Minimum gap between events in minutes
     * @param {number} workingHoursLimit - Maximum working hours per day
     */
    constructor(day, date, minGap, workingHoursLimit, events, breaks, timeBlocks) {
        this.day = day;
        this.date = date;
        this.minGap = minGap;
        this.workingHoursLimit = workingHoursLimit;
        this.events = events;
        this.breaks = breaks;
        this.timeBlocks = timeBlocks;
    }

    /** @returns {string} the day of the week */
    getDay() {
        return this.day;
    }

    /** @returns {ScheduleDate} the date */
    getDate() {
        return this.date;
    }

    /** @returns {Array} the list of events */
    getEvents() {
        return this.events;
    }

    /**
     * Returns all rigid events for the day.
     * @returns {RigidEvent[]}
     */
    getRigidEvents() {
        return this.events.filter((e) => e instanceof RigidEvent);
    }

    /**
     * Returns all flexible events for the day.
     * @returns {FlexibleEvent[]}
     */
    getFlexibleEvents() {
        return this.events.filter((e) => e instanceof FlexibleEvent);
    }

    /** @returns {Array} the list of breaks */
    getBreaks() {
        return this.breaks;
    }

    /** @returns {Array} the list of time blocks */
    getTimeBlocks() {
        return this.timeBlocks;
    }

    /** @returns {number} the minimum gap between events in minutes */
    getMinGap() {
        return this.minGap;
    }

    /** @returns {number} the maximum working hours per day */
    getWorkingHoursLimit() {
        return this.workingHoursLimit;
    }

    /**
     * Sets the maximum working hours per day.
     * @param {number} limit - Must be > 0.
     */
    setWorkingHoursLimit(limit) {
        this.workingHoursLimit = limit;
    }

    /**
     * Adds a rigid event (with fixed time) to the schedule.
     * @param {RigidEvent} event
     */
    addEvent(event) {
        this.events.push(event);
        const tb = TimeBlock.fromRigidEvent(event);
        if (tb) {
            this.timeBlocks.push(tb);
        } else {
            console.warn('Null TimeBlock created, skipping');
        }
        this.sortSchedule();
    }

    /**
     * Adds a flexible event (with specified start and end time) to the schedule.
     * Throws errors if there is any conflict or if the working hours limit is exceeded.
     * @param {FlexibleEvent} event
     * @param {number} startTime - Start time in 24-hour integer format (e.g., 930)
     * @param {number} endTime - End time in 24-hour integer format (e.g., 1045)
     * @throws {EventConflictError} if the event overlaps an existing event or break
     * @throws {WorkingLimitExceededError} if adding the event exceeds the working hours limit
     */
    addFlexibleEvent(event, startTime, endTime) {
        if (this._checkEventConflict(startTime, endTime)) {
            throw new EventConflictError();
        } else if (
            event.getDuration() + this.calculateWorkingHours() * 60 >
            this.workingHoursLimit * 60
        ) {
            throw new WorkingLimitExceededError();
        } else {
            this.events.push(event);
            const tb = TimeBlock.fromFlexibleEvent(event, this.date, startTime, endTime);
            if (tb) {
                this.timeBlocks.push(tb);
            } else {
                console.warn('Null TimeBlock created, skipping');
            }
            this.sortSchedule();
        }
    }

    /**
     * Adds a break to the schedule.
     * REQUIRES: No events must be added before adding a break.
     * @param {Break} breakTime
     */
    addBreak(breakTime) {
        this.breaks.push(breakTime);
        const tb = TimeBlock.fromBreak(breakTime, this.date);
        if (tb) {
            this.timeBlocks.push(tb);
        } else {
            console.warn('Null TimeBlock created, skipping');
        }
        this.sortSchedule();
    }

    /**
     * Removes an event from the schedule.
     * @param {Event} event
     */
    removeEvent(event) {
        this.events = this.events.filter((e) => !e.equals(event));
        // Remove corresponding time block by matching event name.
        for (let i = 0; i < this.timeBlocks.length; i++) {
            if (this.timeBlocks[i].getName() === event.getName()) {
                this.timeBlocks.splice(i, 1);
                break;
            }
        }
    }

    /**
     * Removes a break from the schedule.
     * @param {Break} breakTime
     */
    removeBreak(breakTime) {
        this.breaks = this.breaks.filter((b) => !b.equals(breakTime)); // Assumes Break implements equals()
        // Remove corresponding time block by matching break properties.
        for (let i = 0; i < this.timeBlocks.length; i++) {
            if (
                this.timeBlocks[i].getName() === 'Break' &&
                this.timeBlocks[i].getStartTime().equals(breakTime.getStartTime()) &&
                this.timeBlocks[i].getEndTime().equals(breakTime.getEndTime())
            ) {
                this.timeBlocks.splice(i, 1);
                break;
            }
        }
    }

    /**
     * Calculates the total working hours (based on events of type EDUCATION, MEETING, or WORK).
     * @returns {number} Total working hours (in whole hours)
     */
    calculateWorkingHours() {
        let totalWorkingMinutes = 0;
        for (let event of this.events) {
            if (event.getType() !== ActivityType.BREAK) {
                totalWorkingMinutes += event.getDuration();
            }
        }
        return Math.floor(totalWorkingMinutes / 60);
    }

    /**
     * Checks if the given flexible event conflicts with any existing event or break.
     * Returns true if the event overlaps with any time block.
     * @param {number} startTime - Start time in 24-hour format
     * @param {number} endTime - End time in 24-hour format
     * @returns {boolean} true if there is a conflict, false otherwise.
     */
    _checkEventConflict(startTime, endTime) {
        const newStart = new Time24(startTime);
        const newEnd = new Time24(endTime);

        for (let tb of this.timeBlocks) {
            // Check for overlap. Two intervals [newStart, newEnd] and [tbStart, tbEnd] overlap if:
            // newStart < tbEnd && newEnd > tbStart
            if (newStart.isBefore(tb.getEndTime()) && newEnd.isAfter(tb.getStartTime())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Sorts the time blocks in chronological order by their start times.
     */
    sortSchedule() {
        this.timeBlocks.sort((a, b) => {
            if (a.getStartTime().isBefore(b.getStartTime())) return -1;
            if (a.getStartTime().equals(b.getStartTime())) return 0;
            return 1;
        });
    }

    /**
     * Makes DaySchedule iterable over its time blocks.
     * @returns {Iterator<TimeBlock>}
     */
    [Symbol.iterator]() {
        let index = 0;
        const timeBlocks = this.timeBlocks;
        return {
            next() {
                if (index < timeBlocks.length) {
                    return { value: timeBlocks[index++], done: false };
                } else {
                    return { done: true };
                }
            },
        };
    }

    /**
     * @returns {string} A string representation of the day schedule.
     */
    toString() {
        let result = `Day: ${this.day}\n`;
        for (let tb of this.timeBlocks) {
            result += tb.toString() + '\n';
        }
        return result;
    }
}

export default Day;
