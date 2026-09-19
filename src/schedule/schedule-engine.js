/**
 * Schedule engine.
 *
 * The single source of truth for "what is happening right now". Pure
 * functions over the configuration; shared by the browser dashboard and the
 * Node API so both agree on periods, passing time, lunch, and no-school days.
 *
 *   buildDailySchedule(config, dateKey, defaultScheduleKey)
 *     -> { blocks, scheduleKey, scheduleName, noSchool, reason }
 *   computeState(blocks, minutesOfDay)
 *     -> snapshot for the UI / API
 */

import { parseTimeToMinutes } from "../utils/time.js";
import { normalizeKind, runsOnWeekday } from "./presets.js";
import { getCalendarEntry, isNoSchool, getScheduleOverride } from "./calendar.js";

/**
 * Convert a preset ("periods" list) into a flat list of blocks, synthesizing
 * passing-time blocks for any gap between consecutive periods.
 */
export function buildBlocks(periods) {
    const blocks = [];
    const list = Array.isArray(periods) ? periods : [];

    for (const period of list) {
        const start = parseTimeToMinutes(period.start);
        const end = parseTimeToMinutes(period.end);
        const previous = blocks[blocks.length - 1];
        const gap = previous ? start - previous.end : 0;

        if (gap > 0) {
            blocks.push({
                name: "Passing Time",
                start: previous.end,
                end: start,
                kind: "passing",
                passing: true
            });
        }

        blocks.push({
            name: period.name,
            start,
            end,
            kind: normalizeKind(period),
            passing: false
        });
    }

    return blocks;
}

/**
 * Resolve which schedule applies on a given date, applying calendar overrides.
 */
export function buildDailySchedule(config, dateKey, weekdayIndex) {
    const calendar = config.calendar || {};
    const schedules = config.schedules || {};
    const defaultKey =
        (config.settings && config.settings.defaultSchedule) || "regular";

    const entry = getCalendarEntry(calendar, dateKey);
    let preset = null;
    let scheduleKey = null;

    if (isNoSchool(entry)) {
        return {
            dateKey,
            scheduleKey: null,
            scheduleName: entry.name || "No School",
            blocks: [],
            noSchool: true,
            reason: entry.name || "No School"
        };
    }

    const override = getScheduleOverride(entry);

    if (override && typeof override === "object") {
        // Inline calendar schedule: { name?, periods: [...] }
        preset = override;
        scheduleKey = null;
    } else {
        scheduleKey = typeof override === "string" ? override : defaultKey;
        preset = schedules[scheduleKey] || null;
    }

    if (!preset) {
        return {
            dateKey,
            scheduleKey,
            scheduleName: scheduleKey,
            blocks: [],
            noSchool: true,
            reason: `Schedule "${scheduleKey}" is not defined.`
        };
    }

    if (!runsOnWeekday(preset, weekdayIndex)) {
        return {
            dateKey,
            scheduleKey,
            scheduleName: preset.name || scheduleKey,
            blocks: [],
            noSchool: true,
            reason: `${preset.name || scheduleKey} does not run today.`
        };
    }

    return {
        dateKey,
        scheduleKey,
        scheduleName: preset.name || scheduleKey,
        blocks: buildBlocks(preset.periods || []),
        noSchool: false,
        reason: ""
    };
}

/**
 * A snapshot of the current moment for a resolved daily schedule.
 */
export function computeState(blocks, minutesOfDay) {
    const empty = {
        stateKey: "no-school",
        stateLabel: "No School",
        currentBlock: null,
        progress: null,
        nextBlock: null,
        nextStartInSeconds: null
    };

    if (!blocks.length) {
        return empty;
    }

    const firstStart = blocks[0].start;
    const lastEnd = blocks[blocks.length - 1].end;

    const activeIndex = blocks.findIndex(
        (block) => minutesOfDay >= block.start && minutesOfDay < block.end
    );

    let stateKey;
    let stateLabel;
    let currentBlock = null;

    if (activeIndex === -1 && minutesOfDay < firstStart) {
        stateKey = "before-school";
        stateLabel = "Before School";
    } else if (activeIndex === -1) {
        stateKey = "after-school";
        stateLabel = "After School";
    } else {
        currentBlock = blocks[activeIndex];

        if (currentBlock.kind === "passing") {
            stateKey = "in-passing";
            stateLabel = "Passing Period";
        } else if (currentBlock.kind === "lunch") {
            stateKey = "in-lunch";
            stateLabel = "Lunch";
        } else {
            stateKey = "in-period";
            stateLabel = currentBlock.name;
        }
    }

    // Next block is the first real activity that has not yet begun.
    // Synthesized passing gaps are skipped so "Next" points at the next
    // period or lunch. Explicit passing entries (passing: false) still count.
    const nextIndex = blocks.findIndex(
        (block) => block.start > minutesOfDay && !block.passing
    );
    const nextBlock = nextIndex === -1 ? null : blocks[nextIndex];

    let progress = null;
    if (currentBlock) {
        const elapsed = minutesOfDay - currentBlock.start;
        const remaining = currentBlock.end - minutesOfDay;
        const total = currentBlock.end - currentBlock.start;

        progress = {
            elapsedMinutes: elapsed,
            remainingMinutes: remaining,
            blockMinutes: total,
            percentage: total > 0 ? (elapsed / total) * 100 : 0
        };
    }

    return {
        stateKey,
        stateLabel,
        currentBlock,
        progress,
        nextBlock,
        nextStartInSeconds:
            nextBlock ? Math.max(0, Math.round((nextBlock.start - minutesOfDay) * 60)) : null,
        nextStartMinutes: nextBlock ? nextBlock.start : null
    };
}