/**
 * Configuration validation.
 *
 * Pure, dependency-free validation shared by the browser loader and the Node
 * server. Produces human-readable messages suitable for an error screen, and
 * never throws for config problems (bad JSON is handled by the loader/server).
 */

import { normalizeConfig } from "./defaults.js";

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const VALID_TYPES = ["no-school", "schedule"];

function parseMinutes(time) {
    const match = String(time).match(TIME_RE);
    if (!match) {
        return null;
    }
    return Number(match[1]) * 60 + Number(match[2]);
}

function isRealDate(dateKey) {
    const match = String(dateKey).match(DATE_RE);
    if (!match) {
        return false;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function isValidTimezone(timezone) {
    if (timezone === undefined || timezone === null || timezone === "") {
        return true; // means "use local time"
    }
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
        return true;
    } catch {
        return false;
    }
}

function periodsAreOrdered(periods, out) {
    for (let i = 1; i < periods.length; i += 1) {
        const prev = periods[i - 1];
        const curr = periods[i];
        const prevStart = parseMinutes(prev.start);
        const currStart = parseMinutes(curr.start);
        const prevEnd = parseMinutes(prev.end);

        if (currStart === prevStart) {
            out.push(
                `"${curr.name}" starts at the same time as "${prev.name}" (${curr.start}).`
            );
        } else if (currStart < prevStart) {
            out.push(
                `"${curr.name}" (${curr.start}) starts before "${prev.name}" (${prev.start}).`
            );
        } else if (prevEnd > currStart) {
            out.push(
                `"${curr.name}" (${curr.start}) overlaps "${prev.name}" (ends ${prev.end}).`
            );
        }
    }
}

function validatePeriod(period, index, scheduleKey, out) {
    const label = scheduleKey
        ? `Schedule "${scheduleKey}", period ${index + 1}`
        : `Period ${index + 1}`;

    if (!period || typeof period !== "object") {
        out.push(`${label} is not an object.`);
        return;
    }

    if (!period.name || typeof period.name !== "string") {
        out.push(`${label} is missing a name.`);
    }

    if (typeof period.start !== "string" || !TIME_RE.test(period.start)) {
        out.push(`${label} ("${period.name || "?"}") has an invalid start time: "${period.start}". Use "HH:MM".`);
    }
    if (typeof period.end !== "string" || !TIME_RE.test(period.end)) {
        out.push(`${label} ("${period.name || "?"}") has an invalid end time: "${period.end}". Use "HH:MM".`);
    }

    const start = parseMinutes(period.start);
    const end = parseMinutes(period.end);

    if (start !== null && end !== null && end <= start) {
        out.push(`${label} ("${period.name || "?"}") ends before it starts: ${period.start} -> ${period.end}.`);
    }

    if (period.kind !== undefined && !["class", "homeroom", "lunch", "break", "advisory", "passing"].includes(period.kind)) {
        out.push(`${label} ("${period.name || "?"}") has an unknown kind: "${period.kind}".`);
    }
}

/**
 * Validate a raw config object. Returns the normalized config plus an error
 * list. Callers should treat any non-empty `errors` list as a hard failure.
 */
export function validateConfig(raw) {
    const errors = [];

    if (!raw || typeof raw !== "object") {
        return { valid: false, errors: ["config.json must contain a JSON object."] };
    }

    const config = normalizeConfig(raw);

    if (!config.school || typeof config.school.name !== "string" || !config.school.name.trim()) {
        errors.push("school.name is required and must be a string.");
    }

    if (!isValidTimezone(config.settings.timezone)) {
        errors.push(`settings.timezone is not a valid IANA timezone: "${config.settings.timezone}". Try "America/Chicago".`);
    }

    if (typeof config.settings.defaultSchedule !== "string") {
        errors.push("settings.defaultSchedule must be the name of a schedule preset.");
    }

    const scheduleKeys = Object.keys(config.schedules);
    if (scheduleKeys.length === 0) {
        errors.push("config must define at least one schedule under schedules (e.g. \"regular\").");
    }

    for (const key of scheduleKeys) {
        const preset = config.schedules[key];
        if (!preset || typeof preset !== "object") {
            errors.push(`Schedule "${key}" must be an object with a "periods" list.`);
            continue;
        }

        const periods = preset.periods;
        if (!Array.isArray(periods)) {
            errors.push(`Schedule "${key}" is missing a "periods" list.`);
            continue;
        }
        if (periods.length === 0) {
            errors.push(`Schedule "${key}" has no periods. Add at least one, or remove the preset.`);
        }

        if (preset.days !== undefined) {
            if (!Array.isArray(preset.days) || preset.days.length === 0) {
                errors.push(`Schedule "${key}" has an invalid "days" list. Use weekday names like ["mon","tue"].`);
            } else {
                for (const day of preset.days) {
                    if (!WEEKDAYS.includes(day)) {
                        errors.push(`Schedule "${key}" has an invalid day "${day}". Use ${WEEKDAYS.join(", ")}.`);
                    }
                }
            }
        }

        periods.forEach((period, index) => validatePeriod(period, index, key, errors));
        periodsAreOrdered(periods, errors);
    }

    if (config.calendar && typeof config.calendar === "object") {
        for (const dateKey of Object.keys(config.calendar)) {
            if (!isRealDate(dateKey)) {
                errors.push(`Calendar date "${dateKey}" is not a valid date. Use "YYYY-MM-DD".`);
                continue;
            }

            const entry = config.calendar[dateKey];
            if (!entry || typeof entry !== "object" ||
                !VALID_TYPES.includes(entry.type)) {
                errors.push(`Calendar entry for "${dateKey}" must have type "no-school" or "schedule".`);
                continue;
            }

            if (entry.type === "schedule") {
                const ref = entry.schedule;
                if (typeof ref === "string") {
                    if (!config.schedules[ref]) {
                        errors.push(`Calendar entry for "${dateKey}" references schedule "${ref}", which does not exist.`);
                    }
                } else if (ref && typeof ref === "object") {
                    const periods = ref.periods || [];
                    if (!Array.isArray(ref.periods) || periods.length === 0) {
                        errors.push(`Calendar entry for "${dateKey}" has an inline schedule with no periods.`);
                    }
                    periods.forEach((period, index) => validatePeriod(period, index, `${dateKey} override`, errors));
                    periodsAreOrdered(periods, errors);
                } else {
                    errors.push(`Calendar entry for "${dateKey}" must set "schedule" to a preset name or an inline schedule object.`);
                }
            }
        }
    } else if (config.calendar !== undefined) {
        errors.push("calendar must be a JSON object keyed by date.");
    }

    if (!Array.isArray(config.announcements)) {
        errors.push("announcements must be a list.");
    } else {
        config.announcements.forEach((item, index) => {
            if (!item || typeof item !== "object" || typeof item.title !== "string" || typeof item.message !== "string") {
                errors.push(`Announcement ${index + 1} must have a "title" and "message".`);
            }
            for (const field of ["from", "until"]) {
                if (item[field] !== undefined && !isRealDate(item[field])) {
                    errors.push(`Announcement ${index + 1} has an invalid "${field}" date: "${item[field]}".`);
                }
            }
        });
    }

    for (const key of ["showClock", "showDate", "showStatus", "showAnnouncements", "showProgress", "showNextPeriod"]) {
        if (config.settings[key] !== undefined && typeof config.settings[key] !== "boolean") {
            errors.push(`settings.${key} must be true or false.`);
        }
    }
    if (config.settings.theme !== undefined && !["light", "dark", "system"].includes(config.settings.theme)) {
        errors.push(`settings.theme must be "light", "dark" or "system".`);
    }

    return {
        valid: errors.length === 0,
        errors,
        config
    };
}