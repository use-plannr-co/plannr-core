import { db } from '../../config/db.js';
import { schedules, days, blocks } from '../../db/schema.js';
import { eq, and, isNull, gte, lte, asc, inArray } from 'drizzle-orm';

// ─── Timezone helpers ─────────────────────────────────────────────────────────

/**
 * Returns today's date string (YYYY-MM-DD) in the given IANA timezone.
 * Falls back to UTC if the timezone is invalid.
 */
function getTodayString(timezone) {
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Returns the current local time as a 24h integer (e.g. 14:30 → 1430).
 * Used to determine whether a task's end time has already passed.
 */
function getCurrentTimeInt(timezone) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(new Date());
        const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
        const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
        return h * 100 + m;
    } catch {
        const now = new Date();
        return now.getUTCHours() * 100 + now.getUTCMinutes();
    }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatTime(time24) {
    const h = Math.floor(time24 / 100);
    const m = time24 % 100;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h > 12 ? h - 12 : h || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatBlock(block) {
    return {
        id: block.id,
        title: block.title,
        startAt: formatTime(block.startAt),
        endAt: formatTime(block.endAt),
        duration: block.duration,
        type: block.type,
        priority: block.priority,
        completed: block.completed,
    };
}

async function getActiveSchedule(userId) {
    console.log('[Tool Helper] getActiveSchedule query - userId:', userId);
    const [schedule] = await db.select().from(schedules)
        .where(and(
            eq(schedules.ownerId, userId),
            eq(schedules.isActive, true),
            isNull(schedules.deletedAt)
        ))
        .limit(1);
    console.log('[Tool Helper] Query result:', schedule ? `Found schedule ID: ${schedule.id}` : 'No schedule found');
    return schedule || null;
}

/** Returns today's [day row, todayBlocks] for the user, or null if none. */
async function getTodayData(userId, timezone) {
    const schedule = await getActiveSchedule(userId);
    if (!schedule) return null;

    const today = getTodayString(timezone);
    const [day] = await db.select().from(days)
        .where(and(eq(days.scheduleId, schedule.id), eq(days.date, today)))
        .limit(1);
    if (!day) return { today, day: null, todayBlocks: [] };

    const todayBlocks = await db.select().from(blocks)
        .where(and(eq(blocks.dayId, day.id), isNull(blocks.deletedAt)))
        .orderBy(asc(blocks.startAt));

    return { today, day, todayBlocks };
}

// ─── Executors ────────────────────────────────────────────────────────────────

export async function executeGetActiveSchedule(input, userId) {
    console.log('[Tool] executeGetActiveSchedule called for userId:', userId);
    const schedule = await getActiveSchedule(userId);
    if (!schedule) return JSON.stringify({ error: 'No active schedule found.' });

    const scheduleDays = await db.select({ id: days.id }).from(days)
        .where(eq(days.scheduleId, schedule.id));
    const dayIds = scheduleDays.map(d => d.id);

    let totalBlocks = 0;
    let completedBlocks = 0;
    if (dayIds.length > 0) {
        const allBlocks = await db.select({ completed: blocks.completed })
            .from(blocks)
            .where(and(inArray(blocks.dayId, dayIds), isNull(blocks.deletedAt)));
        totalBlocks = allBlocks.length;
        completedBlocks = allBlocks.filter(b => b.completed).length;
    }

    return JSON.stringify({
        id: schedule.id,
        title: schedule.title,
        strategy: schedule.strategy,
        numDays: schedule.numDays,
        workingHours: `${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`,
        periodStart: schedule.periodStart,
        periodEnd: schedule.periodEnd,
        totalBlocks,
        completedBlocks,
        completionRate: totalBlocks > 0
            ? `${Math.round((completedBlocks / totalBlocks) * 100)}%`
            : '0%',
    });
}

export async function executeGetTodaysTasks(input, userId, timezone) {
    console.log('[Tool] executeGetTodaysTasks called for userId:', userId, 'timezone:', timezone);
    const data = await getTodayData(userId, timezone);
    if (!data) return JSON.stringify({ error: 'No active schedule found.' });

    const { today, todayBlocks } = data;
    return JSON.stringify({
        date: today,
        blocks: todayBlocks.map(formatBlock),
        summary: { total: todayBlocks.length, completed: todayBlocks.filter(b => b.completed).length },
    });
}

export async function executeGetCompletedTasks(input, userId, timezone) {
    console.log('[Tool] executeGetCompletedTasks called for userId:', userId);
    const data = await getTodayData(userId, timezone);
    if (!data) return JSON.stringify({ error: 'No active schedule found.' });

    const { today, todayBlocks } = data;
    const completed = todayBlocks.filter(b => b.completed);
    return JSON.stringify({
        date: today,
        blocks: completed.map(formatBlock),
        summary: { completed: completed.length, total: todayBlocks.length },
    });
}

export async function executeGetIncompleteTasks(input, userId, timezone) {
    console.log('[Tool] executeGetIncompleteTasks called for userId:', userId);
    const data = await getTodayData(userId, timezone);
    if (!data) return JSON.stringify({ error: 'No active schedule found.' });

    const { today, todayBlocks } = data;
    const incomplete = todayBlocks.filter(b => !b.completed);
    return JSON.stringify({
        date: today,
        blocks: incomplete.map(formatBlock),
        summary: { incomplete: incomplete.length, total: todayBlocks.length },
    });
}

export async function executeGetOverdueTasks(input, userId, timezone) {
    console.log('[Tool] executeGetOverdueTasks called for userId:', userId, 'timezone:', timezone);
    const data = await getTodayData(userId, timezone);
    if (!data) return JSON.stringify({ error: 'No active schedule found.' });

    const { today, todayBlocks } = data;
    const currentTimeInt = getCurrentTimeInt(timezone);

    // Overdue = end time has passed AND not yet completed
    const overdue = todayBlocks.filter(b => b.endAt < currentTimeInt && !b.completed);
    return JSON.stringify({
        date: today,
        currentTime: formatTime(currentTimeInt),
        blocks: overdue.map(formatBlock),
        summary: { overdue: overdue.length, total: todayBlocks.length },
    });
}

export async function executeGetUpcomingTasks(input, userId, timezone) {
    const daysAhead = Math.min(Math.max(input.days || 3, 1), 7);
    const schedule = await getActiveSchedule(userId);
    if (!schedule) return JSON.stringify({ error: 'No active schedule found.' });

    const today = getTodayString(timezone);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const upcomingDays = await db.select().from(days)
        .where(and(
            eq(days.scheduleId, schedule.id),
            gte(days.date, today),
            lte(days.date, futureDateStr)
        ))
        .orderBy(asc(days.date));

    const result = await Promise.all(upcomingDays.map(async (d) => {
        const dayBlocks = await db.select().from(blocks)
            .where(and(eq(blocks.dayId, d.id), isNull(blocks.deletedAt)))
            .orderBy(asc(blocks.startAt));
        return {
            date: d.date,
            dayName: d.dayName,
            blocks: dayBlocks.map(formatBlock),
            summary: { total: dayBlocks.length, completed: dayBlocks.filter(b => b.completed).length },
        };
    }));

    return JSON.stringify({ days: result });
}

export async function executeGetScheduleForDate(input, userId) {
    const { date } = input;
    if (!date) return JSON.stringify({ error: 'A date parameter (YYYY-MM-DD) is required.' });

    const schedule = await getActiveSchedule(userId);
    if (!schedule) return JSON.stringify({ error: 'No active schedule found.' });

    const [day] = await db.select().from(days)
        .where(and(eq(days.scheduleId, schedule.id), eq(days.date, date)))
        .limit(1);

    if (!day) {
        return JSON.stringify({
            date,
            blocks: [],
            message: `No tasks scheduled for ${date}.`,
        });
    }

    const dayBlocks = await db.select().from(blocks)
        .where(and(eq(blocks.dayId, day.id), isNull(blocks.deletedAt)))
        .orderBy(asc(blocks.startAt));

    return JSON.stringify({
        date,
        dayName: day.dayName,
        blocks: dayBlocks.map(formatBlock),
        summary: { total: dayBlocks.length, completed: dayBlocks.filter(b => b.completed).length },
    });
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function executeTool(toolName, toolInput, userId, timezone = 'UTC') {
    switch (toolName) {
        case 'get_active_schedule':    return executeGetActiveSchedule(toolInput, userId);
        case 'get_todays_tasks':       return executeGetTodaysTasks(toolInput, userId, timezone);
        case 'get_completed_tasks':    return executeGetCompletedTasks(toolInput, userId, timezone);
        case 'get_incomplete_tasks':   return executeGetIncompleteTasks(toolInput, userId, timezone);
        case 'get_overdue_tasks':      return executeGetOverdueTasks(toolInput, userId, timezone);
        case 'get_upcoming_tasks':     return executeGetUpcomingTasks(toolInput, userId, timezone);
        case 'get_schedule_for_date':  return executeGetScheduleForDate(toolInput, userId);
        default: return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
}
