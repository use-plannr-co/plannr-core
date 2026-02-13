import { db } from '../../config/db.js';
import { schedules, days, blocks } from '../../db/schema.js';
import { eq, and, isNull, gte, lte, asc, inArray } from 'drizzle-orm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Executors ────────────────────────────────────────────────────────────────

export async function executeGetActiveSchedule(input, userId) {
    console.log('[Tool] executeGetActiveSchedule called for userId:', userId);
    const schedule = await getActiveSchedule(userId);
    console.log('[Tool] Active schedule result:', schedule ? 'Found' : 'Not found');
    if (!schedule) return JSON.stringify({ error: 'No active schedule found.' });

    const scheduleDays = await db.select({ id: days.id }).from(days)
        .where(eq(days.scheduleId, schedule.id));
    const dayIds = scheduleDays.map(d => d.id);

    let totalBlocks = 0;
    let completedBlocks = 0;
    if (dayIds.length > 0) {
        const allBlocks = await db.select({ completed: blocks.completed })
            .from(blocks)
            .where(and(
                inArray(blocks.dayId, dayIds),
                isNull(blocks.deletedAt)
            ));
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

export async function executeGetTodaysTasks(input, userId) {
    console.log('[Tool] executeGetTodaysTasks called for userId:', userId);
    const schedule = await getActiveSchedule(userId);
    console.log('[Tool] Active schedule result:', schedule ? 'Found' : 'Not found');
    if (!schedule) return JSON.stringify({ error: 'No active schedule found.' });

    const today = new Date().toISOString().split('T')[0];
    console.log('[Tool] Looking for tasks on date:', today);

    const [day] = await db.select().from(days)
        .where(and(eq(days.scheduleId, schedule.id), eq(days.date, today)))
        .limit(1);

    if (!day) {
        return JSON.stringify({
            date: today,
            blocks: [],
            message: 'No tasks scheduled for today.',
        });
    }

    const todayBlocks = await db.select().from(blocks)
        .where(and(eq(blocks.dayId, day.id), isNull(blocks.deletedAt)))
        .orderBy(asc(blocks.startAt));

    return JSON.stringify({
        date: today,
        dayName: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        blocks: todayBlocks.map(formatBlock),
        summary: {
            total: todayBlocks.length,
            completed: todayBlocks.filter(b => b.completed).length,
        },
    });
}

export async function executeGetUpcomingTasks(input, userId) {
    const daysAhead = Math.min(Math.max(input.days || 3, 1), 7);
    const schedule = await getActiveSchedule(userId);
    if (!schedule) return JSON.stringify({ error: 'No active schedule found.' });

    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
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
            summary: {
                total: dayBlocks.length,
                completed: dayBlocks.filter(b => b.completed).length,
            },
        };
    }));

    return JSON.stringify({ days: result });
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function executeTool(toolName, toolInput, userId) {
    switch (toolName) {
        case 'get_active_schedule':  return executeGetActiveSchedule(toolInput, userId);
        case 'get_todays_tasks':     return executeGetTodaysTasks(toolInput, userId);
        case 'get_upcoming_tasks':   return executeGetUpcomingTasks(toolInput, userId);
        default: return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
}
