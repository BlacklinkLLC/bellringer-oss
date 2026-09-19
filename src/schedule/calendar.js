/**
 * Calendar helpers for special days.
 *
 * A calendar entry may have type "no-school" or "schedule". Schedule entries
 * reference a preset by name, or carry an inline schedule object.
 */

export function getCalendarEntry(calendar, dateKey) {
    if (!calendar || typeof calendar !== "object") {
        return null;
    }
    return calendar[dateKey] || null;
}

export function isNoSchool(entry) {
    return Boolean(entry) && entry.type === "no-school";
}

export function getScheduleOverride(entry) {
    if (!entry || entry.type !== "schedule") {
        return null;
    }
    return entry.schedule; // string preset name or inline object
}