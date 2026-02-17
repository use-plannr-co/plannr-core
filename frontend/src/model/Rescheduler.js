import Schedule from './Schedule.js';
import EarliestFitStrategy from './EarliestFitStrategy.js';
import BalancedWorkStrategy from './BalancedWorkStrategy.js';
import DeadlineOrientedStrategy from './DeadlineOrientedStrategy.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import Time24 from './Time24.js';
import Break from './Break.js';

/**
 * Manages the rescheduling of tasks on user request.
 */
class Rescheduler {
    /**
     * @param {Schedule} schedule - The schedule to be rescheduled.
     */
    constructor(schedule) {
        this._extractBreaks(schedule);
        this._extractRigidEvents(schedule);
        this._extractFlexibleEvents(schedule);
        this._extractDependencies(schedule);
        this.strategy = schedule.strategy;
        this.numDays = schedule.numDays;
        this.firstDate = schedule.day1Date;
        this.firstDay = schedule.day1Day;
        this.minGap = schedule.minGap;
        this.workingHoursLimit = schedule.workingHoursLimit;
        this.startTime = schedule.startTime.toInt();
        this.endTime = schedule.endTime.toInt();
    }

    /**
     * @param {Schedule} schedule
     */
    _extractBreaks(schedule) {
        this.breaks = [];
        schedule.getAllDatesInOrder().forEach((date) => {
            const day = schedule.getScheduleForDate(date);
            if (day) {
                day.getBreaks().forEach((breakTime) => {
                    this.breaks.push({ date: date, breakTime: breakTime });
                });
            }
        });
    }

    /**
     * @param {Schedule} schedule
     */
    _extractRigidEvents(schedule) {
        this.rigidEvents = [];
        schedule.getAllDatesInOrder().forEach((date) => {
            const day = schedule.getScheduleForDate(date);
            if (day) {
                day.getRigidEvents().forEach((event) => {
                    this.rigidEvents.push(event);
                });
            }
        });
    }

    /**
     * @param {Schedule} schedule
     */
    _extractFlexibleEvents(schedule) {
        this.flexibleEvents = [];
        schedule.getAllDatesInOrder().forEach((date) => {
            const day = schedule.getScheduleForDate(date);
            if (day) {
                day.getFlexibleEvents().forEach((event) => {
                    this.flexibleEvents.push(event);
                });
            }
        });
    }

    /**
     * @param {Schedule} schedule
     */
    _extractDependencies(schedule) {
        this.dependencies = schedule.eventDependencies;
    }

    /**
     * Reschedule all incomplete flexible events whose original time has passed.
     * Completed time blocks remain untouched in their slots. Only tasks that are
     * either overdue or upcoming from the current moment are collected and
     * reinserted using the schedule's existing strategy.
     * @param {Schedule} schedule
     * @return {Schedule} the updated schedule with all missing tasks moved to future time slots
     */
    missedTaskShifting(schedule) {
        const now = new Date();
        const currentDate = convertDateToScheduleDate(now);
        const currentTime = new Time24(now.getHours() * 100 + now.getMinutes());

        const toReschedule = [];

        schedule.getAllDatesInOrder().forEach((id) => {
            const day = schedule.getScheduleForDate(id);
            if (!day) return;

            day.getFlexibleEvents().forEach((event) => {
                const tb = schedule.locateTimeBlockForEvent(event);
                if (!tb || tb.isCompleted()) return;

                toReschedule.push(event);
                day.removeEvent(event);
            });
        });

        if (toReschedule.length === 0) return schedule;

        let strat;
        let rescheduled;
        switch (this.strategy) {
            case 'earliest-fit':
                strat = new EarliestFitStrategy(
                    {
                        numDays: this.numDays,
                        breaks: [],
                        repeatedBreaks: [],
                        rigidEvents: [],
                        flexibleEvents: [],
                        eventDependencies: this.dependencies,
                    },
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                rescheduled = strat.reschedule(schedule, toReschedule, currentDate, currentTime);
                break;
            case 'balanced-work':
                strat = new BalancedWorkStrategy(
                    {
                        numDays: this.numDays,
                        breaks: [],
                        repeatedBreaks: [],
                        rigidEvents: [],
                        flexibleEvents: [],
                        eventDependencies: this.dependencies,
                    },
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                rescheduled = strat.reschedule(schedule, toReschedule, currentDate, currentTime);
                break;
            case 'deadline-oriented':
                strat = new DeadlineOrientedStrategy(
                    {
                        numDays: this.numDays,
                        breaks: [],
                        repeatedBreaks: [],
                        rigidEvents: [],
                        flexibleEvents: [],
                        eventDependencies: this.dependencies,
                    },
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                rescheduled = strat.reschedule(schedule, toReschedule, currentDate, currentTime);
                break;
            default:
                throw new Error(`Unknown strategy: ${this.strategy}`);
        }

        return rescheduled;
    }

    /**
     * Adds new time blocks to the schedule based on the provided events and breaks.
     * If the event is a RigidEvent, it is added directly to the schedule.
     * If the event is a flexible event, it is added using the current scheduling strategy.
     * Breaks can be added either as specific date breaks or as repeated breaks.
     * @param {Schedule} schedule
     * @param {Event[]} newEvents - New events to be added to the schedule.
     * @param {Break[]} newBreaks - New breaks to be added to the schedule.
     * @return {Schedule} the schedule with new time blocks added
     */
    addNewTimeBlocks(schedule, newEvents, newBreaks, newRepeatedBreaks, newEventDependencies) {
        if (newEventDependencies) {
            this.dependencies = newEventDependencies;
            schedule.eventDependencies = newEventDependencies;
        }
        const now = new Date();
        const currentDate = convertDateToScheduleDate(now);
        const currentTime = new Time24(now.getHours() * 100 + now.getMinutes());

        const flexEvents = [];

        for (const br of newBreaks) {
            const [date, breakTime] = br;
            if (date && breakTime) {
                schedule.addBreak(date, breakTime);
            }
        }

        for (const rb of newRepeatedBreaks) {
            schedule.addRepeatedBreak(rb);
        }

        for (const evt of newEvents) {
            if (evt instanceof RigidEvent) {
                schedule.addRigidEvent(evt.getDate(), evt);
            } else {
                flexEvents.push(evt);
            }
        }

        if (flexEvents.length > 0) {
            let strat;
            switch (this.strategy) {
                case 'earliest-fit':
                    strat = new EarliestFitStrategy(
                        {
                            numDays: this.numDays,
                            breaks: [],
                            repeatedBreaks: [],
                            rigidEvents: [],
                            flexibleEvents: [],
                            eventDependencies: this.dependencies,
                        },
                        this.firstDate,
                        this.firstDay,
                        this.minGap,
                        this.workingHoursLimit,
                    );
                    break;
                case 'balanced-work':
                    strat = new BalancedWorkStrategy(
                        {
                            numDays: this.numDays,
                            breaks: [],
                            repeatedBreaks: [],
                            rigidEvents: [],
                            flexibleEvents: [],
                            eventDependencies: this.dependencies,
                        },
                        this.firstDate,
                        this.firstDay,
                        this.minGap,
                        this.workingHoursLimit,
                    );
                    break;
                case 'deadline-oriented':
                    strat = new DeadlineOrientedStrategy(
                        {
                            numDays: this.numDays,
                            breaks: [],
                            repeatedBreaks: [],
                            rigidEvents: [],
                            flexibleEvents: [],
                            eventDependencies: this.dependencies,
                        },
                        this.firstDate,
                        this.firstDay,
                        this.minGap,
                        this.workingHoursLimit,
                    );
                    break;
                default:
                    throw new Error(`Unknown strategy: ${this.strategy}`);
            }

            strat.reschedule(schedule, flexEvents, currentDate, currentTime);
        }

        return schedule;
    }

    /**
     * Switches the scheduling strategy of the schedule.
     * This method removes all flexible events that are not completed and reschedules them
     * using the new strategy. It also updates the schedule's strategy property.
     * @param {Schedule} schedule
     * @param {string} newStrategy - The new scheduling strategy to be applied.
     * @return {Schedule} the schedule with the new strategy applied
     */
    strategySwitch(schedule, newStrategy) {
        const now = new Date();
        const currentDate = convertDateToScheduleDate(now);
        const currentTime = new Time24(now.getHours() * 100 + now.getMinutes());

        const toReschedule = [];

        schedule.getAllDatesInOrder().forEach((id) => {
            const day = schedule.getScheduleForDate(id);
            if (!day) return;

            day.getFlexibleEvents().forEach((event) => {
                const tb = schedule.locateTimeBlockForEvent(event);
                if (!tb || tb.isCompleted()) return;

                toReschedule.push(event);
                day.removeEvent(event);
            });
        });

        this.strategy = newStrategy;
        schedule.strategy = newStrategy;

        if (toReschedule.length === 0) return schedule;

        let strat;
        switch (newStrategy) {
            case 'earliest-fit':
                strat = new EarliestFitStrategy(
                    {
                        numDays: this.numDays,
                        breaks: [],
                        repeatedBreaks: [],
                        rigidEvents: [],
                        flexibleEvents: [],
                        eventDependencies: this.dependencies,
                    },
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                break;
            case 'balanced-work':
                strat = new BalancedWorkStrategy(
                    {
                        numDays: this.numDays,
                        breaks: [],
                        repeatedBreaks: [],
                        rigidEvents: [],
                        flexibleEvents: [],
                        eventDependencies: this.dependencies,
                    },
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                break;
            case 'deadline-oriented':
                strat = new DeadlineOrientedStrategy(
                    {
                        numDays: this.numDays,
                        breaks: [],
                        repeatedBreaks: [],
                        rigidEvents: [],
                        flexibleEvents: [],
                        eventDependencies: this.dependencies,
                    },
                    this.firstDate,
                    this.firstDay,
                    this.minGap,
                    this.workingHoursLimit,
                );
                break;
            default:
                throw new Error(`Unknown strategy: ${newStrategy}`);
        }

        strat.reschedule(schedule, toReschedule, currentDate, currentTime);
        return schedule;
    }
}

export default Rescheduler;
