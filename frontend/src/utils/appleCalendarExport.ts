// appleCalendarExport.ts
//
// Direct-add Plannr schedule events to Apple Calendar using expo-calendar.
//
// Usage (example):
//   import { addScheduleToAppleCalendar } from '../utils/appleCalendarExport';
//   await addScheduleToAppleCalendar(schedule);
//
// Notes:
// - Requires: npx expo install expo-calendar
// - Requires iOS Info.plist key (you already added):
//     NSCalendarsUsageDescription
// - This file is Apple-focused. It will no-op or throw on non-iOS depending on options.

import { Alert, Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

// ---------- Public API ----------

type AddOptions = {
    calendarTitle?: string; // default "Plannr"
    calendarColor?: string; // default "#4F46E5"
    showAlerts?: boolean; // default true
    throwOnNonIOS?: boolean; // default false
    // If true, we try to store an external ID so you can later update/dedupe.
    // (Still add-only in this version; see comments below.)
    setExternalId?: boolean; // default true
};

export async function addScheduleToAppleCalendar(
    name: String,
    schedule: any,
    options: AddOptions = {},
) {
    const {
        calendarTitle = `${name}: ${schedule.name || schedule.day1Date.getId()} - Plannr`,
        calendarColor = '#4F46E5',
        showAlerts = true,
        throwOnNonIOS = false,
        setExternalId = true,
    } = options;

    if (Platform.OS !== 'ios') {
        if (throwOnNonIOS) throw new Error('Apple Calendar direct add is only supported on iOS.');
        if (showAlerts)
            Alert.alert('Not supported', 'Direct add to Apple Calendar is only available on iOS.');
        return { added: 0, calendarId: null as string | null };
    }

    // 1) Permission
    await ensureCalendarPermission();

    // 2) Find or create Plannr calendar
    const calendarId = await getOrCreateCalendar({
        title: calendarTitle,
        color: calendarColor,
    });

    // 3) Add events
    let added = 0;

    for (const day of iterateDays(schedule)) {
        for (const tb of iterateTimeBlocks(day)) {
            const { title, notes, startDate, endDate, uid } = coerceTimeBlock(tb);

            // Basic guard
            if (!startDate || !endDate || !title) continue;

            // Optional: stable externalId to enable future updates/deduping.
            // expo-calendar supports `id` (returned) and `creationDate`, etc.
            // There is also `url` field and `notes`. We'll use `url` as a stable tag (safe & searchable).
            // You can later search events in your Plannr calendar and detect duplicates by this tag.
            const externalTag = setExternalId
                ? `plannr://event/${encodeURIComponent(uid)}`
                : undefined;

            await Calendar.createEventAsync(calendarId, {
                title,
                notes,
                startDate,
                endDate,
                timeZone: getUserTimeZoneSafe(),
                url: externalTag,
            });

            added += 1;
        }
    }

    if (showAlerts) {
        Alert.alert(
            'Added to Apple Calendar',
            `Added ${added} event${added === 1 ? '' : 's'} to "${calendarTitle}".`,
        );
    }

    return { added, calendarId };
}

// ---------- Core helpers ----------

async function ensureCalendarPermission() {
    const existing = await Calendar.getCalendarPermissionsAsync();
    if (existing.status === 'granted') return;

    const requested = await Calendar.requestCalendarPermissionsAsync();
    if (requested.status !== 'granted') {
        throw new Error('Calendar permission not granted.');
    }
}

async function getOrCreateCalendar(params: { title: string; color: string }) {
    const { title, color } = params;

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    // If it already exists, reuse it
    const existing = calendars.find((c) => c.title === title);
    if (existing?.id) return existing.id;

    // Pick a source for the new calendar (iOS needs a source)
    const defaultSource = getDefaultIOSSource(calendars);

    if (!defaultSource) {
        // Very rare, but guard anyway
        throw new Error('No valid calendar source found on this device.');
    }

    const newId = await Calendar.createCalendarAsync({
        title,
        color,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultSource.id,
        source: defaultSource,
        name: title,
        ownerAccount: defaultSource.name,
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    return newId;
}

function getDefaultIOSSource(calendars: Calendar.Calendar[]) {
    // Prefer iCloud or local sources that allow event creation.
    // expo-calendar returns sources like "iCloud", "Default", etc.
    const sources = calendars.map((c) => c.source).filter(Boolean) as Calendar.Source[];

    // Prefer iCloud if present
    const iCloud = sources.find((s) => (s.name || '').toLowerCase().includes('icloud'));
    if (iCloud) return iCloud;

    // Otherwise take first available source
    return sources[0] ?? null;
}

function coerceTimeBlock(tb: any): {
    title: string;
    notes: string;
    startDate: Date | null;
    endDate: Date | null;
    uid: string;
} {
    // Supports your model-style getters OR plain fields.
    const title = tb?.getName?.() ?? tb?.name ?? 'Untitled';
    const notes = tb?.getActivityType?.() ?? tb?.activityType ?? '';

    const date = tb?.getDate?.() ?? tb?.date;
    const start = tb?.getStartTime?.() ?? tb?.startTime;
    const end = tb?.getEndTime?.() ?? tb?.endTime;

    const uid = tb?.getUID?.() ?? tb?.uid ?? fallbackUID(tb);

    const startDate = date && start ? toJSLocalDate(date, start) : null;
    const endDate = date && end ? toJSLocalDate(date, end) : null;

    return { title, notes, startDate, endDate, uid };
}

function toJSLocalDate(scheduleDate: any, time24: any): Date {
    // Interprets as device-local time (which is what you want for Apple direct add)
    const year = scheduleDate?.getYear?.() ?? scheduleDate?.year;
    const month = scheduleDate?.getMonth?.() ?? scheduleDate?.month; // 1-12
    const day = scheduleDate?.getDate?.() ?? scheduleDate?.date;

    const hour = time24?.getHour?.() ?? time24?.hour;
    const minute = time24?.getMinute?.() ?? time24?.minute;

    return new Date(year, month - 1, day, hour, minute, 0);
}

function getUserTimeZoneSafe(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

// ---------- Iterators (compatible with your Schedule/Day models) ----------

function iterateDays(schedule: any): any[] | Iterable<any> {
    if (!schedule) return [];

    // If schedule is iterable (e.g., implements Symbol.iterator)
    if (typeof schedule[Symbol.iterator] === 'function') return schedule;

    // If you have a map: schedule.scheduleMap or schedule.weekSchedule, etc.
    if (schedule.weekSchedule && typeof schedule.weekSchedule.values === 'function') {
        return schedule.weekSchedule.values();
    }

    if (schedule.schedule && typeof schedule.schedule.values === 'function') {
        return schedule.schedule.values();
    }

    if (schedule.days && Array.isArray(schedule.days)) return schedule.days;

    // Fallback: maybe schedule is an object of days
    if (typeof schedule === 'object') return Object.values(schedule);

    return [];
}

function iterateTimeBlocks(day: any): any[] | Iterable<any> {
    if (!day) return [];

    if (typeof day[Symbol.iterator] === 'function') return day;

    if (day.timeBlocks && Array.isArray(day.timeBlocks)) return day.timeBlocks;

    if (day.blocks && Array.isArray(day.blocks)) return day.blocks;

    // Fallback: if day is an object of blocks
    if (typeof day === 'object') return Object.values(day);

    return [];
}

function fallbackUID(tb: any): string {
    const name = tb?.getName?.() ?? tb?.name ?? 'event';
    const date = tb?.getDate?.() ?? tb?.date;
    const start = tb?.getStartTime?.() ?? tb?.startTime;

    const y = date?.getYear?.() ?? date?.year ?? '';
    const m = date?.getMonth?.() ?? date?.month ?? '';
    const d = date?.getDate?.() ?? date?.date ?? '';
    const hh = start?.getHour?.() ?? start?.hour ?? '';
    const mm = start?.getMinute?.() ?? start?.minute ?? '';

    const key = `${name}-${y}-${m}-${d}-${hh}${mm}`;
    return `plannr-${hashString(key)}`;
}

function hashString(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
}
