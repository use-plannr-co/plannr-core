import { db } from '../../config/db.js';
import { blocks, days, schedules, userAnalytics, dailyMoodCheckins } from '../../db/schema.js';
import { eq, and, isNull, ne, gte, desc, asc } from 'drizzle-orm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function time24ToMinutes(t) {
    return Math.floor(t / 100) * 60 + (t % 100);
}

function getBlockDurationMinutes(block) {
    if (block.duration && block.duration > 0) return block.duration;
    return time24ToMinutes(block.endAt) - time24ToMinutes(block.startAt);
}

function getBlockHour(block) {
    return Math.floor(block.startAt / 100);
}

function getDayOfWeek(dateStr) {
    // dateStr is "YYYY-MM-DD". Use UTC to avoid timezone shifts.
    const d = new Date(dateStr + 'T00:00:00Z');
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        d.getUTCDay()
    ];
}

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

// ─── Core Computation ─────────────────────────────────────────────────────────

async function fetchRawBlocks(userId) {
    const cutoffDate = addDays(new Date().toISOString().slice(0, 10), -90);

    return db
        .select({
            completed: blocks.completed,
            startAt: blocks.startAt,
            endAt: blocks.endAt,
            type: blocks.type,
            category: blocks.category,
            priority: blocks.priority,
            duration: blocks.duration,
            date: days.date,
            dayName: days.dayName,
        })
        .from(blocks)
        .innerJoin(days, eq(blocks.dayId, days.id))
        .innerJoin(schedules, eq(days.scheduleId, schedules.id))
        .where(
            and(
                eq(schedules.ownerId, userId),
                isNull(blocks.deletedAt),
                ne(blocks.type, 'break'),
                gte(days.date, cutoffDate)
            )
        );
}

function computeStreaks(datesWithCompletions) {
    if (datesWithCompletions.length === 0) return { current: 0, longest: 0 };

    const dateSet = new Set(datesWithCompletions);
    const today = new Date().toISOString().slice(0, 10);

    // Current streak: walk back from today
    let current = 0;
    let checkDate = today;
    while (dateSet.has(checkDate)) {
        current++;
        checkDate = addDays(checkDate, -1);
    }

    // If no activity today, check if streak is alive from yesterday
    if (current === 0) {
        checkDate = addDays(today, -1);
        while (dateSet.has(checkDate)) {
            current++;
            checkDate = addDays(checkDate, -1);
        }
    }

    // Longest streak over entire dataset
    const sorted = [...datesWithCompletions].sort();
    let longest = 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
        const diff =
            (new Date(sorted[i] + 'T00:00:00Z') - new Date(sorted[i - 1] + 'T00:00:00Z')) /
            86400000;
        if (diff === 1) {
            streak++;
        } else {
            longest = Math.max(longest, streak);
            streak = 1;
        }
    }
    longest = Math.max(longest, streak, current);

    return { current, longest };
}

export async function computeAnalytics(userId) {
    const rawBlocks = await fetchRawBlocks(userId);

    if (rawBlocks.length === 0) {
        return {
            dailyData: [],
            dowStats: {},
            hourlyStats: {},
            categoryStats: {},
            priorityStats: {},
            summary: {
                overallCompletionRate: 0,
                currentStreak: 0,
                longestStreak: 0,
                totalBlocks: 0,
                completedBlocks: 0,
                totalScheduledHours: 0,
                totalFocusHours: 0,
                daysWithData: 0,
                oldestDate: null,
            },
        };
    }

    // ── Daily data ────────────────────────────────────────────────────────────
    const dailyMap = {};
    for (const b of rawBlocks) {
        if (!dailyMap[b.date]) {
            dailyMap[b.date] = { date: b.date, total: 0, completed: 0, scheduledMinutes: 0, focusMinutes: 0 };
        }
        const mins = getBlockDurationMinutes(b);
        dailyMap[b.date].total++;
        dailyMap[b.date].scheduledMinutes += mins;
        if (b.completed) {
            dailyMap[b.date].completed++;
            if (mins >= 60) dailyMap[b.date].focusMinutes += mins;
        }
    }
    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // ── Day-of-week stats ─────────────────────────────────────────────────────
    const DOW_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dowMap = {};
    for (const d of DOW_ORDER) dowMap[d] = { total: 0, completed: 0, rate: 0 };

    for (const b of rawBlocks) {
        const dow = getDayOfWeek(b.date);
        if (dowMap[dow]) {
            dowMap[dow].total++;
            if (b.completed) dowMap[dow].completed++;
        }
    }
    for (const d of DOW_ORDER) {
        dowMap[d].rate = dowMap[d].total > 0 ? dowMap[d].completed / dowMap[d].total : 0;
    }

    // ── Hourly stats ──────────────────────────────────────────────────────────
    const hourlyMap = {};
    for (const b of rawBlocks) {
        const hour = getBlockHour(b);
        if (!hourlyMap[hour]) hourlyMap[hour] = { total: 0, completed: 0 };
        hourlyMap[hour].total++;
        if (b.completed) hourlyMap[hour].completed++;
    }

    // ── Category stats ────────────────────────────────────────────────────────
    const categoryMap = {};
    for (const b of rawBlocks) {
        const cat = b.category || 'UNCATEGORIZED';
        if (!categoryMap[cat]) categoryMap[cat] = { total: 0, completed: 0, rate: 0, totalMinutes: 0 };
        const mins = getBlockDurationMinutes(b);
        categoryMap[cat].total++;
        categoryMap[cat].totalMinutes += mins;
        if (b.completed) categoryMap[cat].completed++;
    }
    for (const cat of Object.keys(categoryMap)) {
        categoryMap[cat].rate =
            categoryMap[cat].total > 0 ? categoryMap[cat].completed / categoryMap[cat].total : 0;
    }

    // ── Priority stats ────────────────────────────────────────────────────────
    const priorityMap = {};
    for (const b of rawBlocks) {
        const pri = b.priority || 'NONE';
        if (!priorityMap[pri]) priorityMap[pri] = { total: 0, completed: 0, rate: 0 };
        priorityMap[pri].total++;
        if (b.completed) priorityMap[pri].completed++;
    }
    for (const pri of Object.keys(priorityMap)) {
        priorityMap[pri].rate =
            priorityMap[pri].total > 0 ? priorityMap[pri].completed / priorityMap[pri].total : 0;
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalBlocks = rawBlocks.length;
    const completedBlocks = rawBlocks.filter((b) => b.completed).length;
    const totalScheduledMinutes = rawBlocks.reduce((sum, b) => sum + getBlockDurationMinutes(b), 0);
    const totalFocusMinutes = rawBlocks
        .filter((b) => b.completed && getBlockDurationMinutes(b) >= 60)
        .reduce((sum, b) => sum + getBlockDurationMinutes(b), 0);

    const datesWithCompletions = [
        ...new Set(rawBlocks.filter((b) => b.completed).map((b) => b.date)),
    ];
    const { current: currentStreak, longest: longestStreak } =
        computeStreaks(datesWithCompletions);

    const allDates = [...new Set(rawBlocks.map((b) => b.date))].sort();

    return {
        dailyData,
        dowStats: dowMap,
        hourlyStats: hourlyMap,
        categoryStats: categoryMap,
        priorityStats: priorityMap,
        summary: {
            overallCompletionRate: totalBlocks > 0 ? completedBlocks / totalBlocks : 0,
            currentStreak,
            longestStreak,
            totalBlocks,
            completedBlocks,
            totalScheduledHours: Math.round((totalScheduledMinutes / 60) * 10) / 10,
            totalFocusHours: Math.round((totalFocusMinutes / 60) * 10) / 10,
            daysWithData: allDates.length,
            oldestDate: allDates[0] || null,
        },
    };
}

// ─── Cache Layer ──────────────────────────────────────────────────────────────

export async function getOrComputeAnalytics(userId) {
    const [cached] = await db
        .select()
        .from(userAnalytics)
        .where(eq(userAnalytics.userId, userId))
        .limit(1);

    const todayUTC = new Date().toISOString().slice(0, 10);
    if (cached && cached.computedAt.toISOString().slice(0, 10) === todayUTC) {
        return cached.data;
    }

    const data = await computeAnalytics(userId);

    await db
        .insert(userAnalytics)
        .values({ userId, data, computedAt: new Date() })
        .onConflictDoUpdate({
            target: userAnalytics.userId,
            set: { data, computedAt: new Date(), updatedAt: new Date() },
        });

    return data;
}

// ─── Mood Check-ins ───────────────────────────────────────────────────────────

export async function submitMoodCheckin(userId, date, rating) {
    await db
        .insert(dailyMoodCheckins)
        .values({ userId, date, rating })
        .onConflictDoUpdate({
            target: [dailyMoodCheckins.userId, dailyMoodCheckins.date],
            set: { rating },
        });
}

export async function getMoodCheckins(userId) {
    const cutoffDate = addDays(new Date().toISOString().slice(0, 10), -30);
    return db
        .select({ date: dailyMoodCheckins.date, rating: dailyMoodCheckins.rating })
        .from(dailyMoodCheckins)
        .where(
            and(eq(dailyMoodCheckins.userId, userId), gte(dailyMoodCheckins.date, cutoffDate))
        )
        .orderBy(desc(dailyMoodCheckins.date));
}
