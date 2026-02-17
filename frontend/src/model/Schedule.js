import Day from './Day.js';
import ScheduleDate from './ScheduleDate.js';
import TimeBlock from './TimeBlock.js';
import RigidEvent from './RigidEvent.js';
import FlexibleEvent from './FlexibleEvent.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Represents a week schedule that contains schedules for each day of the week.
 */
class Schedule {
    /**
     * @param {number} numDays - Number of days in the schedule
     * @param {number} minGap - The minimum gap between events
     * @param {ScheduleDate} day1Date - The date of the first day in the week
     * @param {string} day1Day - The day of the week on which the schedule starts
     * @param {number} workingHoursLimit - Max working hours per day
     * @param {EventDependencies} eventDependencies - Dependencies between events
     * @param {Map<string, Day>} schedule - Optional initial schedule map
     * @param {string} strategy - The scheduling strategy to use (e.g., EarliestFit, BalancedWork, DeadlineOriented)
     */
    constructor(
        numDays,
        minGap,
        day1Date,
        day1Day,
        workingHoursLimit,
        eventDependencies,
        schedule,
        strategy,
        startTime,
        endTime,
    ) {
        this.numDays = numDays; // number of days in the schedule
        this.day1Date = day1Date; // the first date of the week
        this.day1Day = day1Day; // the first day of the week
        this.minGap = minGap; // minimum gap between events
        this.workingHoursLimit = workingHoursLimit; // max working hours per day
        this.eventDependencies = eventDependencies; // dependencies between events
        this.schedule = schedule; // ordered map of day → DaySchedule
        this.strategy = strategy; // scheduling strategy (e.g., EarliestFit, BalancedWork, DeadlineOriented)
        this.startTime = startTime; // start time of the schedule in HHMM format
        this.endTime = endTime; // end time of the schedule in HHMM format
        if (this.schedule == null) {
            this.schedule = new Map();
            this._initiateSchedule(numDays, minGap, day1Date, day1Day, workingHoursLimit);
        }
    }

    /** @returns {Map<string, Day>} the full week schedule */
    getSchedule() {
        return this.schedule;
    }

    /** @returns {ScheduleDate} the first date of the schedule */
    getFirstDate() {
        return this.day1Date;
    }

    /** @returns {ScheduleDate[]} the list of all dates added to the schedule */
    getAllDatesInOrder() {
        return Array.from(this.schedule.keys());
    }

    /**
     * @param {string} date
     * @returns {Day} the schedule for the specified day
     */
    getScheduleForDate(date) {
        return this.schedule.get(date);
    }

    setStartTime(startTime) {
        this.startTime = startTime;
    }

    setEndTime(endTime) {
        this.endTime = endTime;
    }

    /**
     * @param {ScheduleDate} date
     * @param {RigidEvent} event
     */
    addRigidEvent(date, event) {
        this.schedule.get(date.getId()).addEvent(event);
    }

    /**
     * @param {ScheduleDate} date
     * @param {FlexibleEvent} event
     * @param {number} startTime
     * @param {number} endTime
     * @throws {EventConflictError}
     * @throws {WorkingLimitExceededError}
     */
    addFlexibleEvent(date, event, startTime, endTime) {
        this.schedule.get(date.getId()).addFlexibleEvent(event, startTime, endTime);
    }

    /**
     * Locates the time block for a given event.
     * @param {Event} event
     * @returns {TimeBlock|null}
     */
    locateTimeBlockForEvent(event) {
        const flag =
            event instanceof RigidEvent
                ? 'rigid'
                : event instanceof FlexibleEvent
                  ? 'flexible'
                  : null;
        if (!flag) return null;

        for (const date of this.getAllDatesInOrder()) {
            const schedule = this.schedule.get(date);
            for (const timeBlock of schedule) {
                if (timeBlock.getName() === event.getName() && timeBlock.getType() === flag) {
                    return timeBlock;
                }
            }
        }

        return null;
    }

    /**
     * Adds the same break to all days of the week.
     * @param {Break} breakTime
     */
    addBreakToFullWeek(breakTime) {
        for (const date of this.getAllDatesInOrder()) {
            this.schedule.get(date).addBreak(breakTime);
        }
    }

    /**
     * Adds a break to a specific day.
     * @param {ScheduleDate} date
     * @param {Break} breakTime
     */
    addBreak(date, breakTime) {
        this.schedule.get(date.getId()).addBreak(breakTime);
    }

    /**
     * Removes an event from a specific day's schedule.
     * @param {ScheduleDate} date
     * @param {Event} event
     */
    removeEvent(date, event) {
        this.schedule.get(date.getId()).removeEvent(event);
    }

    /**
     * Removes a break from a specific day's schedule.
     * @param {ScheduleDate} date
     * @param {Break} breakTime
     */
    removeBreak(date, breakTime) {
        this.schedule.get(date.getId()).removeBreak(breakTime);
    }

    /**
     * @returns {number} total occupied hours for the entire week
     */
    calculateTotalOccupiedHours() {
        let totalMinutes = 0;
        for (const date of this.getAllDatesInOrder()) {
            const schedule = this.schedule.get(date.getId());
            for (const timeBlock of schedule) {
                if (timeBlock.getType() !== 'break') {
                    totalMinutes += timeBlock.getDuration();
                }
            }
        }
        return totalMinutes / 60;
    }

    /**
     * Iterator over all the day schedules in the week.
     * @returns {Iterator<Day>}
     */
    [Symbol.iterator]() {
        return this.schedule.values();
    }

    /**
     * Initializes the full 7-day week schedule starting from a specific day and date.
     * @private
     * @param {number} minGap
     * @param {ScheduleDate} day1Date
     * @param {string} day1Day
     * @param {number} workingHoursLimit
     */
    _initiateSchedule(numDays, minGap, day1Date, day1Day, workingHoursLimit) {
        let index = DAYS.indexOf(day1Day);
        let currDate = day1Date;

        for (let i = 0; i < numDays; i++) {
            const dayName = DAYS[index % 7];
            const schedule = new Day(dayName, currDate, minGap, workingHoursLimit, [], [], []);
            this.schedule.set(currDate.getId(), schedule);
            currDate = currDate.getNextDate();
            index++;
        }
    }

    equals(other) {
        if (!(other instanceof Schedule)) {
            return false;
        }

        if (
            this.numDays !== other.numDays ||
            this.minGap !== other.minGap ||
            this.workingHoursLimit !== other.workingHoursLimit ||
            this.strategy !== other.strategy
        ) {
            return false;
        }

        if (!this.day1Date.equals(other.day1Date) || this.day1Day !== other.day1Day) {
            return false;
        }

        if (this.eventDependencies.equals(other.eventDependencies) === false) {
            return false;
        }

        if (
            this.startTime.equals(other.startTime) === false ||
            this.endTime.equals(other.endTime) === false
        ) {
            return false;
        }

        if (this.schedule.size !== other.schedule.size) {
            return false;
        }

        for (const [date, day] of this.schedule.entries()) {
            const otherDay = other.schedule.get(date);
            if (!day.equals(otherDay)) {
                return false;
            }
        }

        return true;
    }
}

export default Schedule;
