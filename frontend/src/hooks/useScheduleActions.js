import Rescheduler from '../model/Rescheduler';
import FlexibleEvent from '../model/FlexibleEvent';
import ActivityType from '../model/ActivityType';
import Priority from '../model/Priority';
import ScheduleDate from '../model/ScheduleDate';
import { useAppState } from '../context/AppStateContext';
import { useBlocksAPI } from '../api/hooks/useBlocksAPI';
import { useSchedulesAPI } from '../api/hooks/useSchedulesAPI';
import { useDaysAPI } from '../api/hooks/useDaysAPI';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Snapshots all non-break TimeBlocks that have a backendId, before the Rescheduler
 * mutates the schedule. Returns an array of { dateString, tb } entries.
 */
function snapshotBlocks(schedule) {
    const result = [];
    for (const dateId of schedule.getAllDatesInOrder()) {
        const day = schedule.getScheduleForDate(dateId);
        if (!day) continue;
        const [dd, mm, yyyy] = dateId.split('-').map(Number);
        const dateString = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        for (const tb of day.getTimeBlocks()) {
            if (tb.getType() !== 'break') {
                result.push({ dateString, tb });
            }
        }
    }
    return result;
}

/**
 * Maps a category string from Claude params to an ActivityType enum value.
 */
function mapCategory(category) {
    const lower = (category || '').toLowerCase();
    if (lower === 'study' || lower === 'education') return ActivityType.EDUCATION;
    if (lower === 'work') return ActivityType.WORK;
    if (lower === 'exercise' || lower === 'recreational') return ActivityType.RECREATIONAL;
    if (lower === 'personal') return ActivityType.PERSONAL;
    if (lower === 'break') return ActivityType.BREAK;
    if (lower === 'meeting') return ActivityType.MEETING;
    if (lower === 'travel') return ActivityType.TRAVEL;
    if (lower === 'errand') return ActivityType.ERRAND;
    return ActivityType.OTHER;
}

/**
 * Maps a priority string from Claude params to a Priority enum value.
 */
function mapPriority(priority) {
    switch ((priority || '').toLowerCase()) {
        case 'high':
            return Priority.HIGH;
        case 'low':
            return Priority.LOW;
        default:
            return Priority.MEDIUM;
    }
}

/**
 * Builds a FlexibleEvent from propose_add_task params.
 */
function buildFlexibleEvent(params) {
    const deadline = params.deadline
        ? (() => {
              const [yyyy, mm, dd] = params.deadline.split('-').map(Number);
              return new ScheduleDate(dd, mm, yyyy);
          })()
        : null;
    return new FlexibleEvent(
        params.name,
        mapCategory(params.category),
        params.duration,
        mapPriority(params.priority),
        deadline,
    );
}

/**
 * Formats a TimeBlock into the shape expected by addBlocksToDay.
 */
function formatBlockForAPI(tb) {
    return {
        title: tb.getName(),
        startAt: tb.getStartTime().toInt(),
        endAt: tb.getEndTime().toInt(),
        duration: tb.getDuration(),
        type: tb.getType(),
        activityType: tb.getActivityType(),
        priority: tb.getPriority(),
        completed: tb.isCompleted(),
    };
}

/**
 * Converts a schedule dateId (dd-mm-yyyy) to a YYYY-MM-DD date string.
 */
function dateIdToString(dateId) {
    const [dd, mm, yyyy] = dateId.split('-').map(Number);
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Diffs old vs new schedule and persists changes via the blocks API.
 * Old blocks are captured BEFORE the Rescheduler mutates the schedule.
 *
 * Matching strategy:
 * - New blocks that still have a backendId → no move needed, check time changes
 * - New blocks without backendId → match by name:type to find the old backendId;
 *   if found on same day → update, different day → delete old + add new
 * - Old backendIds not matched by anything in new schedule → delete
 *
 * @returns {string} human-readable summary of changes
 */
async function persistScheduleChanges(oldSnapshot, newSchedule, scheduleBackendId, api) {
    // Build lookup from old snapshot
    const oldByBackendId = new Map(); // backendId → { dateString, tb }
    const oldByNameType = new Map(); // "name:type" → { dateString, tb, used }
    for (const { dateString, tb } of oldSnapshot) {
        const bid = tb.getBackendId();
        if (bid) {
            oldByBackendId.set(bid, { dateString, tb });
            const key = `${tb.getName()}:${tb.getType()}`;
            if (!oldByNameType.has(key)) {
                oldByNameType.set(key, { dateString, tb, used: false });
            }
        }
    }

    // Fetch backend day IDs
    const daysResp = await api.getDaysByScheduleId(scheduleBackendId);
    const dayIdByDate = new Map();
    for (const day of daysResp?.data || []) {
        dayIdByDate.set(day.date, day.id);
    }

    const processedBackendIds = new Set();
    const toUpdate = []; // { dayBackendId, backendId, startAt, endAt }
    const toAddByDay = new Map(); // dayBackendId → block[]
    const toDeleteCrossDayBackendIds = new Set(); // backendIds of blocks that moved dates (already handled via add)

    for (const dateId of newSchedule.getAllDatesInOrder()) {
        const day = newSchedule.getScheduleForDate(dateId);
        if (!day) continue;
        const dateString = dateIdToString(dateId);
        const dayBackendId = dayIdByDate.get(dateString);
        if (!dayBackendId) continue;

        for (const tb of day.getTimeBlocks()) {
            if (tb.getType() === 'break') continue;

            const backendId = tb.getBackendId();
            if (backendId) {
                // Block retained its backendId — check if times changed
                const oldEntry = oldByBackendId.get(backendId);
                if (oldEntry) {
                    const oldTb = oldEntry.tb;
                    if (
                        oldTb.getStartTime().toInt() !== tb.getStartTime().toInt() ||
                        oldTb.getEndTime().toInt() !== tb.getEndTime().toInt()
                    ) {
                        toUpdate.push({
                            dayBackendId,
                            backendId,
                            startAt: tb.getStartTime().toInt(),
                            endAt: tb.getEndTime().toInt(),
                        });
                    }
                    processedBackendIds.add(backendId);
                }
            } else {
                // New block (rescheduled) — match to old block by name:type
                const key = `${tb.getName()}:${tb.getType()}`;
                const oldEntry = oldByNameType.get(key);
                if (oldEntry && !oldEntry.used) {
                    oldEntry.used = true;
                    const oldBid = oldEntry.tb.getBackendId();
                    processedBackendIds.add(oldBid);

                    if (oldEntry.dateString === dateString) {
                        // Same day — update start/end times
                        toUpdate.push({
                            dayBackendId,
                            backendId: oldBid,
                            startAt: tb.getStartTime().toInt(),
                            endAt: tb.getEndTime().toInt(),
                        });
                    } else {
                        // Different day — delete from old day, add to new day
                        toDeleteCrossDayBackendIds.add(oldBid);
                        if (!toAddByDay.has(dayBackendId)) toAddByDay.set(dayBackendId, []);
                        toAddByDay.get(dayBackendId).push(formatBlockForAPI(tb));
                    }
                } else {
                    // Truly new block (e.g. from propose_add_task) — add
                    if (!toAddByDay.has(dayBackendId)) toAddByDay.set(dayBackendId, []);
                    toAddByDay.get(dayBackendId).push(formatBlockForAPI(tb));
                }
            }
        }
    }

    // Delete cross-day moved blocks from their original days
    for (const [backendId, { dateString }] of oldByBackendId) {
        if (toDeleteCrossDayBackendIds.has(backendId)) {
            const dayBackendId = dayIdByDate.get(dateString);
            if (dayBackendId) {
                await api.deleteBlockFromDay(scheduleBackendId, dayBackendId, backendId);
            }
        }
    }

    // Delete blocks that no longer exist in the new schedule
    for (const [backendId, { dateString }] of oldByBackendId) {
        if (!processedBackendIds.has(backendId) && !toDeleteCrossDayBackendIds.has(backendId)) {
            const dayBackendId = dayIdByDate.get(dateString);
            if (dayBackendId) {
                await api.deleteBlockFromDay(scheduleBackendId, dayBackendId, backendId);
            }
        }
    }

    // Apply time updates
    for (const { dayBackendId, backendId, startAt, endAt } of toUpdate) {
        await api.updateBlockInDay(scheduleBackendId, dayBackendId, backendId, { startAt, endAt });
    }

    // Apply additions
    for (const [dayBackendId, blocks] of toAddByDay) {
        await api.addBlocksToDay(scheduleBackendId, dayBackendId, blocks);
    }

    const updatedCount = toUpdate.length;
    const addedCount = [...toAddByDay.values()].reduce((sum, arr) => sum + arr.length, 0);
    const deletedCount =
        [...oldByBackendId.keys()].filter((bid) => !processedBackendIds.has(bid)).length +
        toDeleteCrossDayBackendIds.size;

    const parts = [];
    if (updatedCount > 0)
        parts.push(`${updatedCount} task${updatedCount !== 1 ? 's' : ''} rescheduled`);
    if (addedCount > 0) parts.push(`${addedCount} task${addedCount !== 1 ? 's' : ''} added`);
    if (deletedCount > 0)
        parts.push(`${deletedCount} task${deletedCount !== 1 ? 's' : ''} removed`);
    return parts.length > 0 ? parts.join(', ') : 'No changes detected';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export default function useScheduleActions() {
    const { appState, setAppState } = useAppState();
    const { updateBlockInDay, addBlocksToDay, deleteBlockFromDay } = useBlocksAPI();
    const { getDaysByScheduleId } = useDaysAPI();
    const { updateSchedule } = useSchedulesAPI();

    const executeAction = async (actionType, params) => {
        const activeSchedule = appState.activeSchedule;
        if (!activeSchedule?.schedule) throw new Error('No active schedule');

        const schedule = activeSchedule.schedule;
        const scheduleBackendId = activeSchedule.backendId;

        // Snapshot blocks BEFORE the Rescheduler mutates the schedule
        const oldSnapshot = snapshotBlocks(schedule);

        const rescheduler = new Rescheduler(schedule);
        let updatedSchedule;
        let fallbackSummary;

        if (actionType === 'missed_task_shift') {
            updatedSchedule = rescheduler.missedTaskShifting(schedule);
            fallbackSummary = 'Missed tasks rescheduled';
        } else if (actionType === 'add_task') {
            const newEvent = buildFlexibleEvent(params);
            updatedSchedule = rescheduler.addNewTimeBlocks(schedule, [newEvent], [], [], null);
            fallbackSummary = `Added "${params.name}" to your schedule`;
        } else if (actionType === 'strategy_switch') {
            updatedSchedule = rescheduler.strategySwitch(schedule, params.newStrategy);
            fallbackSummary = `Strategy switched to ${params.newStrategy}`;
            await updateSchedule(scheduleBackendId, { strategy: params.newStrategy });
        } else {
            throw new Error(`Unknown actionType: ${actionType}`);
        }

        const api = { updateBlockInDay, addBlocksToDay, deleteBlockFromDay, getDaysByScheduleId };
        const changeSummary = await persistScheduleChanges(
            oldSnapshot,
            updatedSchedule,
            scheduleBackendId,
            api,
        );

        setAppState((prev) => ({
            ...prev,
            activeSchedule: { ...prev.activeSchedule, schedule: updatedSchedule },
        }));

        return { summary: changeSummary || fallbackSummary };
    };

    return { executeAction };
}
