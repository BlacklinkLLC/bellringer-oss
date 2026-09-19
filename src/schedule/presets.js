/**
 * Schedule concept definitions.
 *
 * Every entry in a "periods" list is a block of time. The `kind` field lets a
 * school label blocks semantically; if omitted it defaults to "class".
 */

export const KINDS = {
    class: "Class",
    homeroom: "Homeroom",
    lunch: "Lunch",
    passing: "Passing",
    break: "Break",
    advisory: "Advisory"
};

export const DEFAULT_KIND = "class";

export function normalizeKind(period) {
    const kind = period && period.kind;
    return Object.prototype.hasOwnProperty.call(KINDS, kind) ? kind : DEFAULT_KIND;
}

export function kindLabel(block) {
    if (block.passing) {
        return KINDS.passing;
    }
    return KINDS[block.kind] || KINDS[DEFAULT_KIND];
}

/**
 * Map a weekday index (0 = Sunday) to a short name string.
 */
export function weekdayName(index) {
    return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][index] || "";
}

/**
 * A preset may restrict itself to specific weekdays via a "days" list.
 * An empty/absent list means it applies every day.
 */
export function runsOnWeekday(preset, weekday) {
    if (!preset || !Array.isArray(preset.days) || preset.days.length === 0) {
        return true;
    }
    return preset.days.includes(weekdayName(weekday)) || preset.days.includes(String(weekday));
}