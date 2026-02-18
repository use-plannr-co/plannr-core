import Time24 from './Time24.js';
import ScheduleDate from './ScheduleDate.js';
import Schedule from './Schedule.js';
import EventDependencies from './EventDependencies.js';
import ActivityType from './ActivityType.js';

/**
 * Represents an abstract scheduling strategy.
 * Subclasses must implement generateSchedule().
 */
class SchedulingStrategy {
    /**
     * Abstract method to be implemented by subclasses.
     * @param {number} earliestStartTime - in 24-hour format (e.g. 900)
     * @param {number} latestEndTime - in 24-hour format (e.g. 1700)
     * @returns {Schedule}
     */
    generateSchedule(earliestStartTime, latestEndTime) {
        throw new Error('generateSchedule() must be implemented by subclass');
    }

    /**
     * Finds an available time slot in a day schedule.
     * @param {DaySchedule} daySchedule
     * @param {number} duration - in minutes
     * @param {Time24} earliestStartTime
     * @param {Time24} latestEndTime
     * @param {number} minGap - minimum gap between events
     * @returns {number[] | null} - [startTime, endTime] in 24-hour int format or null
     */
    findAvailableSlot(daySchedule, duration, earliestStartTime, latestEndTime, minGap) {
        let start = earliestStartTime.copy();
        let end = start.copy();
        end.addMinutes(duration);

        while (end.isBefore(latestEndTime) || end.equals(latestEndTime)) {
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

            start.addMinutes(5);
            end = start.copy();
            end.addMinutes(duration);
        }

        return null;
    }

    /**
     * Finds the latest allowable date and time for an event based on dependency constraints.
     * @param {Schedule} schedule
     * @param {EventDependencies} eventDependencies
     * @param {Event} event
     * @param {Time24} latestEndTime
     * @returns {[ScheduleDate, Time24]}
     */
    getLatestDateAndTimeForDependency(schedule, eventDependencies, event, latestEndTime) {
        let latestAllowedDate =
            event.getType && event.getDeadline ? event.getDeadline() : event.getDate();

        let earliestScheduledDependent = null;

        for (const [dependentEvent, dependencyList] of eventDependencies
            .getDependencies()
            .entries()) {
            if (dependencyList.includes(event)) {
                const tb = schedule.locateTimeBlockForEvent(dependentEvent);
                const depDate = tb.getDate();

                if (depDate.isBefore(latestAllowedDate) || depDate.equals(latestAllowedDate)) {
                    latestAllowedDate = depDate;
                    earliestScheduledDependent = tb;
                } else if (depDate.equals(latestAllowedDate)) {
                    if (tb.getStartTime().isBefore(earliestScheduledDependent.getStartTime())) {
                        earliestScheduledDependent = tb;
                    }
                }
            }
        }

        const latestTime = earliestScheduledDependent
            ? earliestScheduledDependent.getStartTime()
            : latestEndTime;

        return [latestAllowedDate, latestTime];
    }

    /**
     * Sorts events by deadline ascending (earliest deadline first), with null
     * deadlines placed at the end. This is the Earliest Deadline First (EDF)
     * ordering used by reschedule() so that deadline-constrained events claim
     * slots before unconstrained ones.
     * @param {FlexibleEvent[]} events
     * @returns {FlexibleEvent[]}
     */
    sortByDeadline(events) {
        return [...events].sort((a, b) => {
            const da = a.getDeadline();
            const db = b.getDeadline();
            if (!da && !db) return 0;
            if (!da) return 1;
            if (!db) return -1;
            if (da.getYear() !== db.getYear()) return da.getYear() - db.getYear();
            if (da.getMonth() !== db.getMonth()) return da.getMonth() - db.getMonth();
            return da.getDate() - db.getDate();
        });
    }

    /**
     * Sorts events by urgency using a hierarchical comparator:
     * 1. Deadline-constrained events before no-deadline events (preserves EDF guarantee)
     * 2. Among deadline-constrained: sort by deadline date ASC (Earliest Deadline First)
     * 3. Among same-deadline events: sort by priority DESC (HIGH → MEDIUM → LOW) as tiebreaker
     * 4. Among no-deadline events: sort by priority DESC (HIGH → MEDIUM → LOW)
     *
     * This keeps the EDF correctness guarantee intact — a near-deadline LOW priority task
     * always precedes a far-deadline HIGH priority task — while making priority meaningful
     * for tasks that share a deadline or have no deadline at all.
     * @param {FlexibleEvent[]} events
     * @returns {FlexibleEvent[]}
     */
    sortByUrgency(events) {
        const PRIORITY_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return [...events].sort((a, b) => {
            const da = a.getDeadline();
            const db = b.getDeadline();

            // 1. Deadline-constrained before no-deadline
            if (da && !db) return -1;
            if (!da && db) return 1;

            if (da && db) {
                // 2. Sort by deadline date ASC (EDF)
                if (da.getYear() !== db.getYear()) return da.getYear() - db.getYear();
                if (da.getMonth() !== db.getMonth()) return da.getMonth() - db.getMonth();
                if (da.getDate() !== db.getDate()) return da.getDate() - db.getDate();
                // 3. Same deadline — tiebreak by priority DESC
                return (
                    (PRIORITY_RANK[b.getPriority()] ?? 1) - (PRIORITY_RANK[a.getPriority()] ?? 1)
                );
            }

            // 4. Both have no deadline — sort by priority DESC
            return (PRIORITY_RANK[b.getPriority()] ?? 1) - (PRIORITY_RANK[a.getPriority()] ?? 1);
        });
    }

    /**
     * Returns a topologically sorted list of events.
     * @param {EventDependencies} eventDependencies
     * @param {FlexibleEvent[]} flexibleEvents
     * @returns {Event[]}
     */
    topologicalSortOfEvents(eventDependencies, flexibleEvents) {
        const sorted = [];
        const visited = new Set();

        for (const event of eventDependencies.getDependencies().keys()) {
            this._dfs(event, visited, sorted, eventDependencies);
        }

        const topologicallySorted = [];
        for (const event of flexibleEvents) {
            if (!sorted.includes(event)) {
                topologicallySorted.push(event);
            }
        }

        topologicallySorted.push(...sorted);
        return topologicallySorted;
    }

    /**
     * Helper DFS method for topological sorting.
     * @private
     * @param {Event} current
     * @param {Set} visited
     * @param {Event[]} sorted
     * @param {EventDependencies} eventDependencies
     */
    _dfs(current, visited, sorted, eventDependencies) {
        if (visited.has(current)) return;

        visited.add(current);
        const dependencies = eventDependencies.getDependenciesForEvent(current) || [];
        for (const dep of dependencies) {
            this._dfs(dep, visited, sorted, eventDependencies);
        }

        sorted.push(current);
    }
}

export default SchedulingStrategy;
