const CRLF = '\r\n';

export const exportICS = (schedule, options = {}) => {
    const {
        calendarName = 'Plannr',
        prodId = '-//Plannr//NONSGML v1.0//EN',
        method = 'PUBLISH',

        // timezoneMode: 'utc' | 'tzid'
        timezoneMode = 'utc',

        // Used only for tzid mode
        timeZone = getUserTimeZoneSafe(),
    } = options;

    const dtstamp = formatDTStampUTC(new Date());

    const lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push(`PRODID:${prodId}`);
    lines.push('VERSION:2.0');
    lines.push('CALSCALE:GREGORIAN');
    lines.push(`METHOD:${method}`);

    // Optional metadata (nice to have)
    lines.push(`X-WR-CALNAME:${escapeICSText(calendarName)}`);
    lines.push('X-WR-TIMEZONE:' + escapeICSText(timeZone || 'UTC'));

    // If you later decide to do TZID mode robustly, you ideally include VTIMEZONE here.
    // For v1.0.2: stick to UTC and skip VTIMEZONE.

    // --- Events ---
    for (const date of schedule.getAllDatesInOrder()) {
        for (const tb of schedule.getScheduleForDate(date)?.timeBlocks) {
            const uid = tb.backendId || tb.getUID?.() || buildUIDFallback(tb);

            const summary = escapeICSText(tb.getName?.() ?? tb.name ?? 'Untitled');
            const description = escapeICSText(tb.activityType ?? '');

            const date = tb.date;
            const startTime = tb.startTime;
            const endTime = tb.endTime;

            if (!date || !startTime || !endTime) continue; // or throw

            const startLocal = toJSDateFromModels(date, startTime, timeZone);
            const endLocal = toJSDateFromModels(date, endTime, timeZone);

            lines.push('BEGIN:VEVENT');

            if (timezoneMode === 'tzid' && timeZone) {
                // Local time with TZID (no trailing Z)
                lines.push(`DTSTART;TZID=${timeZone}:${formatLocalDateTime(date, startTime)}`);
                lines.push(`DTEND;TZID=${timeZone}:${formatLocalDateTime(date, endTime)}`);
            } else {
                // UTC time (with trailing Z)
                lines.push(`DTSTART:${formatUTCDateTime(startLocal)}`);
                lines.push(`DTEND:${formatUTCDateTime(endLocal)}`);
            }

            lines.push(`DTSTAMP:${dtstamp}`);
            lines.push(`UID:${escapeICSValue(uid)}`);
            lines.push(`SUMMARY:${summary}`);
            if (description) lines.push(`DESCRIPTION:${description}`);
            lines.push('STATUS:CONFIRMED');
            lines.push('TRANSP:OPAQUE');

            lines.push('END:VEVENT');
        }
    }

    lines.push('END:VCALENDAR');

    // Join with CRLF and ensure the file ends with CRLF
    return lines.join(CRLF) + CRLF;
};

// --- Helpers ---

// Safest “v1.0.2” approach: UTC formatting with a Date object.
const formatUTCDateTime = (dateObj) => {
    // YYYYMMDDTHHMMSSZ
    const y = dateObj.getUTCFullYear();
    const m = pad2(dateObj.getUTCMonth() + 1);
    const d = pad2(dateObj.getUTCDate());
    const hh = pad2(dateObj.getUTCHours());
    const mm = pad2(dateObj.getUTCMinutes());
    const ss = pad2(dateObj.getUTCSeconds());
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
};

const formatDTStampUTC = (dateObj) => formatUTCDateTime(dateObj);

// If you want TZID mode, DTSTART is “floating local time”:
const formatLocalDateTime = (scheduleDate, time24) => {
    const y = scheduleDate.year;
    const mo = scheduleDate.month;
    const da = scheduleDate.date;

    const h = time24.hour;
    const mi = time24.minute;

    return `${pad4(y)}${pad2(mo)}${pad2(da)}T${pad2(h)}${pad2(mi)}00`;
};

// Convert your model date/time into a JS Date.
// Note: JS Date objects don’t reliably construct in arbitrary IANA TZ without a lib.
// For UTC export, you can safely construct in *local device time* and then convert to UTC,
// BUT that assumes scheduleDate/time reflect device local timezone.
// If your schedule is already in device local time, this is fine.
const toJSDateFromModels = (scheduleDate, time24 /*, timeZone */) => {
    const y = scheduleDate.year;
    const mo = scheduleDate.month - 1; // JS month 0-based
    const da = scheduleDate.date;

    const h = time24.hour;
    const mi = time24.minute;

    // Interprets as device local time
    return new Date(y, mo, da, h, mi, 0);
};

const pad2 = (n) => String(n).padStart(2, '0');
const pad4 = (n) => String(n).padStart(4, '0');

// Escape rules for ICS text values (SUMMARY/DESCRIPTION/etc.)
const escapeICSText = (value) => {
    if (value == null) return '';
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\r\n|\n|\r/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
};

// UID shouldn’t contain newlines; keep it conservative
const escapeICSValue = (value) => {
    if (value == null) return '';
    return String(value).replace(/\r\n|\n|\r/g, '');
};

const buildUIDFallback = (tb) => {
    // If you don’t have uid, create one deterministic-ish
    const name = tb.name ?? 'event';
    const date = tb.date;
    const start = tb.startTime;
    const key = `${name}-${date?.year ?? ''}-${start?.hour ?? ''}${start?.minute ?? ''}`;
    return `${hashString(key)}@plannr`;
};

const hashString = (str) => {
    // tiny non-crypto hash
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
};

const getUserTimeZoneSafe = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g., America/Vancouver
    } catch {
        return 'UTC';
    }
};
