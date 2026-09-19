/**
 * Time utilities.
 *
 * Pure functions for parsing and computing wall-clock times. No DOM or server
 * dependencies, so these can run in the browser and in Node (tests / API).
 */

const pad2 = (value) => String(value).padStart(2, "0");

/**
 * "08:25" -> 505 (minutes since midnight).
 * Accepts "H:mm", "HH:mm", "H:mm:ss".
 */
export function parseTimeToMinutes(time) {
    const parts = String(time).split(":").map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 60 + minutes + seconds / 60;
}

/**
 * Return the wall-clock parts (year, month, day, hour, minute, second) for a
 * date rendered in a given IANA timezone.
 *
 * Pass timeZone = null or undefined to use the runtime's local timezone.
 * Throws RangeError if the timezone name is invalid.
 */
export function getPartsInTimeZone(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timeZone || undefined,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const parts = {};
    for (const part of formatter.formatToParts(date)) {
        parts[part.type] = part.value;
    }

    // Some runtimes report midnight as hour "24" with hour12:false.
    const hour = Number(parts.hour) % 24;

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour,
        minute: Number(parts.minute),
        second: Number(parts.second)
    };
}

/**
 * "2026-09-18" style calendar key for a set of timezone parts.
 */
export function toDateKeyFromParts(parts) {
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/**
 * Build a Date in UTC from { year, month, day } so weekday math never shifts
 * across local timezone boundaries.
 */
export function utcDateFromParts(parts) {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

/**
 * Sunday = 0 ... Saturday = 6.
 */
export function weekdayFromParts(parts) {
    return utcDateFromParts(parts).getUTCDay();
}

/**
 * Weekday (0 = Sunday) for a "YYYY-MM-DD" calendar key.
 */
export function weekdayForDateKey(dateKey) {
    const [year, month, day] = String(dateKey).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * A full "now" snapshot in the given timezone:
 * wall-clock parts, weekday, calendar date key, minutes/seconds of day.
 */
export function nowInTimeZone(timeZone) {
    const parts = getPartsInTimeZone(new Date(), timeZone);
    const minutesOfDay =
        parts.hour * 60 + parts.minute + parts.second / 60;

    return {
        ...parts,
        weekday: weekdayFromParts(parts),
        dateKey: toDateKeyFromParts(parts),
        minutesOfDay,
        secondsOfDay: Math.floor(minutesOfDay * 60),
        iso: new Date().toISOString()
    };
}

/**
 * Return a snapshot for an arbitrary UTC instant and timezone.
 * Useful for the API and tests.
 */
export function snapshotAt(utcMillis, timeZone) {
    const parts = getPartsInTimeZone(new Date(utcMillis), timeZone);
    const minutesOfDay =
        parts.hour * 60 + parts.minute + parts.second / 60;

    return {
        ...parts,
        weekday: weekdayFromParts(parts),
        dateKey: toDateKeyFromParts(parts),
        minutesOfDay,
        secondsOfDay: Math.floor(minutesOfDay * 60),
        iso: new Date(utcMillis).toISOString()
    };
}