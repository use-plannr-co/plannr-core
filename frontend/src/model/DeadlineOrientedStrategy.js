import SchedulingStrategy from './SchedulingStrategy.js';
import Schedule from './Schedule.js';
import Time24 from './Time24.js';
import EventConflictError from './exceptions/EventConflictError.js';
import WorkingLimitExceededError from './exceptions/WorkingLimitExceededError.js';

/**
 * Schedules events as late as possible, while respecting deadlines and dependencies.
 */
class DeadlineOrientedStrategy extends SchedulingStrategy {
    constructor(scheduler, firstDate, firstDay, minGap, workingHoursLimit) {
        super();
        this.breaks = scheduler.breaks;
        this.repeatedBreaks = scheduler.repeatedBreaks;
        this.rigidEvents = scheduler.rigidEvents;
        this.flexibleEvents = scheduler.flexibleEvents;
        this.eventDependencies = scheduler.eventDependencies;

        this.deadlineOrientedSchedule = new Schedule(
            scheduler.numDays,
            minGap,
            firstDate,
            firstDay,
            workingHoursLimit,
            this.eventDependencies,
            null,
            'deadline-oriented',
        );
    }

    /**
     * Generates a deadline-oriented schedule.
     * @param {number} earliestStartTime
     * @param {number} latestEndTime
     * @returns {Schedule} the deadline-oriented schedule
     */
    generateSchedule(earliestStartTime, latestEndTime) {
        const startTime = new Time24(earliestStartTime);
        const endTime = new Time24(latestEndTime);

        this.deadlineOrientedSchedule.setStartTime(startTime);
        this.deadlineOrientedSchedule.setEndTime(endTime);

        this._scheduleBreaks();
        this._scheduleEvents(startTime, endTime);
        return this.deadlineOrientedSchedule;
    }

    /** @private */
    _scheduleBreaks() {
        for (const [date, breakTime] of this.breaks) {
            console.log(
                `Scheduling break on ${date.getDateString()} from ${breakTime.startTime.to12HourString()} to ${breakTime.endTime.to12HourString()}`,
            );
            this.deadlineOrientedSchedule.addBreak(date, breakTime);
        }

        for (const breakTime of this.repeatedBreaks) {
            this.deadlineOrientedSchedule.addBreakToFullWeek(breakTime);
        }
    }

    /** @private */
    _scheduleEvents(earliestStartTime, latestEndTime) {
        const scheduled = new Set();
        const datesList = this.deadlineOrientedSchedule.getAllDatesInOrder();
        const minGap = this.deadlineOrientedSchedule.getScheduleForDate(datesList[0]).getMinGap();

        for (const rigidEvent of this.rigidEvents) {
            this.deadlineOrientedSchedule.addRigidEvent(rigidEvent.getDate(), rigidEvent);
            scheduled.add(rigidEvent);
        }

        let sorted = this.topologicalSortOfEvents(this.eventDependencies, this.flexibleEvents);
        sorted.reverse(); // latest-first

        for (const event of sorted) {
            if (scheduled.has(event)) continue;

            if (this._isNotADependency(event)) {
                this._scheduleEventLatest(
                    event,
                    event.getDeadline(),
                    latestEndTime,
                    scheduled,
                    minGap,
                    earliestStartTime,
                    latestEndTime,
                );
            } else {
                const [lastDate, lastTime] = this.getLatestDateAndTimeForDependency(
                    this.deadlineOrientedSchedule,
                    this.eventDependencies,
                    event,
                    latestEndTime,
                );

                this._scheduleEventLatest(
                    event,
                    lastDate,
                    lastTime,
                    scheduled,
                    minGap,
                    earliestStartTime,
                    latestEndTime,
                );
            }
        }
    }

    /** @private */
    _scheduleEventLatest(
        event,
        beforeDate,
        lastTimeOnDate,
        scheduled,
        minGap,
        earliestStartTime,
        latestEndTime,
    ) {
        if (scheduled.has(event)) return;

        const reversedDays = [...this.deadlineOrientedSchedule].reverse();

        for (const daySchedule of reversedDays) {
            const date = daySchedule.getDate();
            if (date.isAfter(beforeDate)) continue;

            const dayEndTime = date.equals(beforeDate) ? lastTimeOnDate : latestEndTime;
            const slot = this.findAvailableSlot(
                daySchedule,
                event.getDuration(),
                earliestStartTime,
                dayEndTime,
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
     * Checks if the event is not a dependency for any other event.
     * @param {FlexibleEvent} event
     * @returns {boolean}
     * @private
     */
    _isNotADependency(event) {
        for (const [_, deps] of this.eventDependencies.getDependencies()) {
            if (deps.includes(event)) return false;
        }
        return true;
    }

    /**
     * Finds latest available slot (reversed logic from earliest).
     * @override
     */
    findAvailableSlot(daySchedule, duration, earliestStartTime, latestEndTime, minGap) {
        let end = latestEndTime.copy();
        let start = end.copy();
        start.subtractMinutes(duration);

        while (start.isAfter(earliestStartTime) || start.equals(earliestStartTime)) {
            let fits = true;

            for (const tb of daySchedule.getTimeBlocks()) {
                const blockStart = tb.getStartTime();
                const blockEnd = tb.getEndTime();

                const latestAllowedEnd = blockStart.copy();
                latestAllowedEnd.subtractMinutes(minGap);
                latestAllowedEnd.addMinutes(1);

                const earliestAllowedStart = blockEnd.copy();
                earliestAllowedStart.addMinutes(minGap);
                earliestAllowedStart.subtractMinutes(1);

                if (!(end.isBefore(latestAllowedEnd) || start.isAfter(earliestAllowedStart))) {
                    fits = false;
                    break;
                }
            }

            if (fits) {
                return [start.toInt(), end.toInt()];
            }

            end.subtractMinutes(5);
            start = end.copy();
            start.subtractMinutes(duration);
        }

        return null;
    }

    /**
     * Reschedules events as late as possible starting from the given date/time.
     * @param {Schedule} schedule
     * @param {FlexibleEvent[]} events
     * @param {ScheduleDate} currentDate
     * @param {Time24} currentTime
     * @returns {Schedule}
     */
    reschedule(schedule, events, currentDate, currentTime, eventDependencies = null) {
        this.deadlineOrientedSchedule = schedule;
        this.flexibleEvents = events;
        if (eventDependencies) {
            this.eventDependencies = eventDependencies;
            this.deadlineOrientedSchedule.eventDependencies = eventDependencies;
        }

        const earliestStart = schedule.startTime;
        const latestEnd = schedule.endTime;
        const minGap = schedule.getScheduleForDate(schedule.getAllDatesInOrder()[0]).getMinGap();

        const scheduled = new Set();
        let sorted = this.topologicalSortOfEvents(this.eventDependencies, events);
        sorted = sorted.filter((e) => events.includes(e));
        sorted.reverse();

        for (const event of sorted) {
            if (scheduled.has(event)) continue;

            if (this._isNotADependency(event)) {
                this._rescheduleEventLatest(
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
                const [lastDate, lastTime] = this.getLatestDateAndTimeForDependency(
                    this.deadlineOrientedSchedule,
                    this.eventDependencies,
                    event,
                    latestEnd,
                );

                this._rescheduleEventLatest(
                    event,
                    lastDate,
                    lastTime,
                    scheduled,
                    minGap,
                    earliestStart,
                    latestEnd,
                    currentDate,
                    currentTime,
                );
            }
        }

        return this.deadlineOrientedSchedule;
    }

    _rescheduleEventLatest(
        event,
        beforeDate,
        lastTimeOnDate,
        scheduled,
        minGap,
        earliestStartTime,
        latestEndTime,
        currentDate,
        currentTime,
    ) {
        if (scheduled.has(event)) return;

        const reversedDays = [...this.deadlineOrientedSchedule].reverse();

        for (const daySchedule of reversedDays) {
            const date = daySchedule.getDate();
            if (date.isAfter(beforeDate) || date.isBefore(currentDate)) continue;

            const dayEndTime = date.equals(beforeDate) ? lastTimeOnDate : latestEndTime;
            const earliest =
                date.equals(currentDate) && currentTime.isAfter(earliestStartTime)
                    ? currentTime
                    : earliestStartTime;

            const slot = this.findAvailableSlot(
                daySchedule,
                event.getDuration(),
                earliest,
                dayEndTime,
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
}

export default DeadlineOrientedStrategy;
