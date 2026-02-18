import Schedule from './Schedule.js';
import ScheduleDate from './ScheduleDate.js';
import RigidEvent from './RigidEvent.js';
import FlexibleEvent from './FlexibleEvent.js';
import Break from './Break.js';
import EventDependencies from './EventDependencies.js';
import EarliestFitStrategy from './EarliestFitStrategy.js';
import BalancedWorkStrategy from './BalancedWorkStrategy.js';
import DeadlineOrientedStrategy from './DeadlineOrientedStrategy.js';

/**
 * Manages scheduling of events and breaks using a chosen strategy.
 */
class Scheduler {
    /**
     * @param {number} numDays - Number of days in the schedule
     * @param {ScheduleDate} date - First date of the week
     * @param {string} day1 - First day of the week (e.g. "Monday")
     * @param {number} minGap - Minimum gap between events
     * @param {number} workingHoursLimit - Max hours per day
     */
    constructor(numDays, date, day1, minGap, workingHoursLimit) {
        this.numDays = numDays;
        this.firstDate = date;
        this.firstDay = day1;
        this.minGap = minGap;
        this.workingHoursLimit = workingHoursLimit;

        /** @type {[ScheduleDate, Break][]} */
        this.breaks = [];

        /** @type {Break[]} */
        this.repeatedBreaks = [];

        /** @type {RigidEvent[]} */
        this.rigidEvents = [];

        /** @type {FlexibleEvent[]} */
        this.flexibleEvents = [];

        /** @type {EventDependencies | null} */
        this.eventDependencies = null;
    }

    /**
     * Adds a one-day break.
     * @param {ScheduleDate} date
     * @param {Break} breakTime
     */
    addBreak(date, breakTime) {
        this.breaks.push([date, breakTime]);
    }

    setBreaks(breaks) {
        this.breaks = breaks;
    }

    /**
     * Adds a break that applies to all days.
     * @param {Break} breakTime
     */
    addRepeatedBreak(breakTime) {
        this.repeatedBreaks.push(breakTime);
    }

    setRepeatedBreaks(repeatedBreaks) {
        this.repeatedBreaks = repeatedBreaks;
    }

    /**
     * Adds a rigid (fixed-time) event.
     * @param {RigidEvent} event
     */
    addRigidEvent(event) {
        this.rigidEvents.push(event);
    }

    setRigidEvents(events) {
        this.rigidEvents = events;
    }

    /**
     * Adds a flexible (unscheduled) event.
     * @param {FlexibleEvent} event
     */
    addFlexibleEvent(event) {
        this.flexibleEvents.push(event);
    }

    setFlexibleEvents(events) {
        this.flexibleEvents = events;
    }

    /**
     * Sets dependencies among flexible events.
     * @param {EventDependencies} dependencies
     */
    setEventDependencies(dependencies) {
        this.eventDependencies = dependencies;
    }

    /**
     * Creates a weekly schedule using the specified strategy.
     * @param {string} strategy - 'Earliest Fit', 'Balanced Work', or 'Deadline Oriented'
     * @param {number} earliestStartTime - e.g. 900
     * @param {number} latestEndTime - e.g. 1800
     * @returns {Schedule}
     */
    createSchedules(strategy, earliestStartTime, latestEndTime) {
        switch (strategy) {
            case 'Earliest Fit': {
                const strat = new EarliestFitStrategy(
                    this,
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                return strat.generateSchedule(earliestStartTime, latestEndTime);
            }

            case 'Balanced Work': {
                const strat = new BalancedWorkStrategy(
                    this,
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                return strat.generateSchedule(earliestStartTime, latestEndTime);
            }

            case 'Deadline Oriented': {
                const strat = new DeadlineOrientedStrategy(
                    this,
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                return strat.generateSchedule(earliestStartTime, latestEndTime);
            }

            default:
                throw new Error(`Unknown scheduling strategy: ${strategy}`);
        }
    }
}

export default Scheduler;
