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
