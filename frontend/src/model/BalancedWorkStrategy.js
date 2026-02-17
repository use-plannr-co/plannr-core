import SchedulingStrategy from './SchedulingStrategy.js';
import Schedule from './Schedule.js';
import Time24 from './Time24.js';
import EventConflictError from './exceptions/EventConflictError.js';
import WorkingLimitExceededError from './exceptions/WorkingLimitExceededError.js';

/**
 * Schedules events by distributing workload evenly across the week.
 */
class BalancedWorkStrategy extends SchedulingStrategy {
    /**
     * @param {Scheduler} scheduler
     * @param {ScheduleDate} firstDate
     * @param {string} firstDay
     * @param {number} minGap
     * @param {number} workingHoursLimit
     */
    constructor(scheduler, firstDate, firstDay, minGap, workingHoursLimit) {
        super();
        this.breaks = scheduler.breaks;
        this.repeatedBreaks = scheduler.repeatedBreaks;
        this.rigidEvents = scheduler.rigidEvents;
        this.flexibleEvents = scheduler.flexibleEvents;
        this.eventDependencies = scheduler.eventDependencies;

        this.balancedWorkSchedule = new Schedule(
            scheduler.numDays,
            minGap,
            firstDate,
            firstDay,
            workingHoursLimit,
            this.eventDependencies,
            null,
            'balanced-work',
        );
    }

    /**
     * Generates a balanced schedule for the week.
     * @param {number} earliestStartTime
     * @param {number} latestEndTime
     * @returns {Schedule} the balanced work schedule
     */
    generateSchedule(earliestStartTime, latestEndTime) {
        const startTime = new Time24(earliestStartTime);
        const endTime = new Time24(latestEndTime);

        this.balancedWorkSchedule.setStartTime(startTime);
        this.balancedWorkSchedule.setEndTime(endTime);

        this._scheduleBreaks();
        this._scheduleEvents(startTime, endTime);
        return this.balancedWorkSchedule;
    }

    /**
     * Adds all fixed and repeated breaks to the schedule.
     * @private
     */
    _scheduleBreaks() {
        for (const [date, breakTime] of this.breaks) {
            this.balancedWorkSchedule.addBreak(date, breakTime);
        }

        for (const breakTime of this.repeatedBreaks) {
            this.balancedWorkSchedule.addBreakToFullWeek(breakTime);
        }
    }

    /**
     * Schedules all events with dependency resolution.
     * @private
     */
    _scheduleEvents(earliestStartTime, latestEndTime) {
        const scheduled = new Set();
        const datesList = this.balancedWorkSchedule.getAllDatesInOrder();
        const minGap = this.balancedWorkSchedule.getScheduleForDate(datesList[0]).getMinGap();

        for (const rigidEvent of this.rigidEvents) {
            this.balancedWorkSchedule.addRigidEvent(rigidEvent.getDate(), rigidEvent);
            scheduled.add(rigidEvent);
        }

        const sortedEvents = this.topologicalSortOfEvents(
            this.eventDependencies,
            this.flexibleEvents,
        );

        for (const event of sortedEvents) {
            if (!scheduled.has(event)) {
                const deps = this.eventDependencies.getDependenciesForEvent(event);
                if (!deps || deps.length === 0) {
                    this._scheduleDependency(
                        event,
                        event.getDeadline(),
                        latestEndTime,
                        scheduled,
                        minGap,
                        earliestStartTime,
                        latestEndTime,
                    );
                } else {
                    this._scheduleAfterDependencies(
                        event,
                        event.getDeadline(),
                        scheduled,
                        minGap,
                        earliestStartTime,
                        latestEndTime,
                    );
                }
            }
        }

        // Log any unscheduled events
        const unscheduled = this.flexibleEvents.filter((e) => !scheduled.has(e));
        if (unscheduled.length > 0) {
            console.warn(
                'Unscheduled events:',
                unscheduled.map((e) => e.toString()),
            );
        }
    }

    /**
     * Recursively schedules an event and all its dependencies.
     * @private
     */
    _scheduleDependency(
        dependency,
        beforeDate,
        lastTimeOnDate,
        scheduled,
        minGap,
        earliestStartTime,
        latestEndTime,
    ) {
        if (scheduled.has(dependency)) return;

        const deps = this.eventDependencies.getDependenciesForEvent(dependency);
        if (deps) {
            for (const dep of deps) {
                if (!scheduled.has(dep)) {
                    this._scheduleDependency(
                        dep,
                        beforeDate,
                        lastTimeOnDate,
                        scheduled,
                        minGap,
                        earliestStartTime,
                        latestEndTime,
                    );
                }
            }
        }

        const daysSorted = this._getDaysSortedByLoad();
        for (const daySchedule of daysSorted) {
            const date = daySchedule.getDate();
            if (date.isAfter(beforeDate)) continue;

            const end = date.equals(beforeDate) ? lastTimeOnDate : latestEndTime;
            const slot = this.findAvailableSlot(
                daySchedule,
                dependency.getDuration(),
                earliestStartTime,
                end,
                minGap,
            );

            if (slot) {
                try {
                    daySchedule.addFlexibleEvent(dependency, slot[0], slot[1]);
                    scheduled.add(dependency);
                    return;
                } catch (e) {
                    if (!(e instanceof WorkingLimitExceededError)) throw e;
                }
            }
        }
    }

    /**
     * Schedules a flexible event after its dependencies.
     * @private
     */
    _scheduleAfterDependencies(
        event,
        beforeDate,
        scheduled,
        minGap,
        earliestStartTime,
        latestEndTime,
    ) {
        const deps = this.eventDependencies.getDependenciesForEvent(event);
        let afterDate = null;
        let earliestTimeOnDate = null;

        for (const dep of deps) {
            const block = this.balancedWorkSchedule.locateTimeBlockForEvent(dep);
            if (!afterDate || block.getDate().isAfter(afterDate)) {
                afterDate = block.getDate();
                earliestTimeOnDate = block.getEndTime();
            }
        }

        const daysSorted = this._getDaysSortedByLoad();
        for (const daySchedule of daysSorted) {
            const date = daySchedule.getDate();
            if (date.isBefore(afterDate) || date.isAfter(beforeDate)) continue;

            const start = date.equals(afterDate) ? earliestTimeOnDate : earliestStartTime;
            const slot = this.findAvailableSlot(
                daySchedule,
                event.getDuration(),
                start,
                latestEndTime,
                minGap,
            );

            if (slot) {
                try {
                    daySchedule.addFlexibleEvent(event, slot[0], slot[1]);
                    scheduled.add(event);
                    return;
                } catch (e) {
                    if (!(e instanceof WorkingLimitExceededError)) throw e;
                }
            }
        }
    }

    /**
     * Reschedules the given events into the current schedule from the specified
     * date and time.
     * @param {Schedule} schedule
     * @param {FlexibleEvent[]} events
     * @param {ScheduleDate} currentDate
     * @param {Time24} currentTime
     * @returns {Schedule}
     */
    reschedule(schedule, events, currentDate, currentTime, eventDependencies = null) {
        this.balancedWorkSchedule = schedule;
        this.flexibleEvents = events;
        if (eventDependencies) {
            this.eventDependencies = eventDependencies;
            this.balancedWorkSchedule.eventDependencies = eventDependencies;
        }

        const earliestStart = schedule.startTime;
        const latestEnd = schedule.endTime;
        const minGap = schedule.getScheduleForDate(schedule.getAllDatesInOrder()[0]).getMinGap();

        const scheduled = new Set();
        let sortedEvents = this.topologicalSortOfEvents(this.eventDependencies, events);
        sortedEvents = sortedEvents.filter((e) => events.includes(e));

        for (const event of sortedEvents) {
            if (!scheduled.has(event)) {
                const deps = this.eventDependencies.getDependenciesForEvent(event);
                if (!deps || deps.length === 0) {
                    this._rescheduleDependency(
                        event,
                        event.getDeadline(),
                        latestEnd,
                        scheduled,
                        minGap,
                        earliestStart,
                        latestEnd,
                        currentDate,
                        currentTime,
                    );
                } else {
                    this._rescheduleAfterDependencies(
                        event,
                        event.getDeadline(),
                        scheduled,
                        minGap,
                        earliestStart,
                        latestEnd,
                        currentDate,
                        currentTime,
                    );
                }
            }
        }

        return this.balancedWorkSchedule;
    }

    _rescheduleDependency(
        dependency,
        beforeDate,
        lastTimeOnDate,
        scheduled,
        minGap,
        earliestStartTime,
        latestEndTime,
        currentDate,
        currentTime,
    ) {
        if (scheduled.has(dependency)) return;

        const deps = this.eventDependencies.getDependenciesForEvent(dependency);
        if (deps) {
            for (const dep of deps) {
                if (!scheduled.has(dep)) {
                    this._rescheduleDependency(
                        dep,
                        beforeDate,
                        lastTimeOnDate,
                        scheduled,
                        minGap,
                        earliestStartTime,
                        latestEndTime,
                        currentDate,
                        currentTime,
                    );
                }
            }
        }

        const daysSorted = this._getDaysSortedByLoad();
        for (const daySchedule of daysSorted) {
            const date = daySchedule.getDate();
            if (date.isAfter(beforeDate) || date.isBefore(currentDate)) continue;

            let start = earliestStartTime;
            if (date.equals(currentDate) && currentTime.isAfter(start)) {
                start = currentTime;
            }
            const end = date.equals(beforeDate) ? lastTimeOnDate : latestEndTime;

            const slot = this.findAvailableSlot(
                daySchedule,
                dependency.getDuration(),
                start,
                end,
                minGap,
            );

            if (slot) {
                try {
                    daySchedule.addFlexibleEvent(dependency, slot[0], slot[1]);
                    scheduled.add(dependency);
                    return;
                } catch (e) {
                    if (!(e instanceof WorkingLimitExceededError)) throw e;
                }
            }
        }
    }

    _rescheduleAfterDependencies(
        event,
        beforeDate,
        scheduled,
        minGap,
        earliestStartTime,
        latestEndTime,
        currentDate,
        currentTime,
    ) {
        const deps = this.eventDependencies.getDependenciesForEvent(event);
        let afterDate = null;
        let earliestTimeOnDate = null;

        for (const dep of deps) {
            const block = this.balancedWorkSchedule.locateTimeBlockForEvent(dep);
            if (!afterDate || block.getDate().isAfter(afterDate)) {
                afterDate = block.getDate();
                earliestTimeOnDate = block.getEndTime();
            }
        }

        const daysSorted = this._getDaysSortedByLoad();
        for (const daySchedule of daysSorted) {
            const date = daySchedule.getDate();
            if (date.isBefore(afterDate) || date.isAfter(beforeDate) || date.isBefore(currentDate))
                continue;

            let start = date.equals(afterDate) ? earliestTimeOnDate : earliestStartTime;
            if (date.equals(currentDate) && currentTime.isAfter(start)) {
                start = currentTime;
            }

            const slot = this.findAvailableSlot(
                daySchedule,
                event.getDuration(),
                start,
                latestEndTime,
                minGap,
            );

            if (slot) {
                try {
                    daySchedule.addFlexibleEvent(event, slot[0], slot[1]);
                    scheduled.add(event);
                    return;
                } catch (e) {
                    if (!(e instanceof WorkingLimitExceededError)) throw e;
                }
            }
        }
    }

    /**
     * Returns the list of DaySchedules sorted by increasing total working hours.
     * @private
     * @returns {DaySchedule[]}
     */
    _getDaysSortedByLoad() {
        const days = [...this.balancedWorkSchedule]; // iterable over DaySchedules
        days.sort((a, b) => a.calculateWorkingHours() - b.calculateWorkingHours());
        return days;
    }
}

export default BalancedWorkStrategy;
