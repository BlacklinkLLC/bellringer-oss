/**
 * Tests for the schedule engine and configuration validation.
 *
 * Run with: npm test
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
    buildBlocks,
    buildDailySchedule,
    computeState
} from "../src/schedule/schedule-engine.js";
import { validateConfig } from "../src/config/validate.js";
import { normalizeConfig } from "../src/config/defaults.js";

/* A small schedule mirroring a typical school day. */
const TEST_CONFIG = {
    school: { name: "Test Middle School" },
    settings: { timezone: "America/Chicago", defaultSchedule: "regular" },
    schedules: {
        regular: {
            name: "Regular Schedule",
            days: ["mon", "tue", "wed", "thu", "fri"],
            periods: [
                { name: "Homeroom", kind: "homeroom", start: "08:00", end: "08:20" },
                { name: "Period 1", start: "08:25", end: "09:15" },
                { name: "Period 2", start: "09:20", end: "10:10" },
                { name: "Lunch", kind: "lunch", start: "10:15", end: "10:45" },
                { name: "Period 3", start: "10:50", end: "11:40" }
            ]
        },
        "early-release": {
            name: "Early Release",
            periods: [
                { name: "Period 1", start: "08:25", end: "09:00" }
            ]
        }
    },
    calendar: {
        "2026-09-21": { type: "no-school", name: "Teacher Work Day" },
        "2026-10-02": { type: "schedule", schedule: "early-release" }
    },
    announcements: []
};

function resolve(dateKey, weekday, minutesOfDay = 8 * 60 + 30) {
    const daily = buildDailySchedule(TEST_CONFIG, dateKey, weekday);
    return { daily, snapshot: computeState(daily.blocks, minutesOfDay) };
}

/* ---------------- buildDailySchedule ---------------- */

test("buildDailySchedule synthesizes passing blocks between periods", () => {
    const { daily } = resolve("2026-09-18", 5); // Friday
    assert.equal(daily.noSchool, false);
    assert.equal(daily.scheduleKey, "regular");

    const kinds = daily.blocks.map((b) => b.kind);
    assert.ok(kinds.includes("passing"));
    assert.equal(daily.blocks.length, TEST_CONFIG.schedules.regular.periods.length + 4);
});

test("buildDailySchedule applies a no-school calendar day", () => {
    const daily = buildDailySchedule(TEST_CONFIG, "2026-09-21", 1);
    assert.equal(daily.noSchool, true);
    assert.deepEqual(daily.blocks, []);
    assert.equal(daily.reason, "Teacher Work Day");
});

test("buildDailySchedule applies a special schedule calendar day", () => {
    const { daily } = resolve("2026-10-02", 5);
    assert.equal(daily.noSchool, false);
    assert.equal(daily.scheduleKey, "early-release");
    assert.equal(daily.blocks[0].name, "Period 1");
});

test("buildDailySchedule treats an off-weekday as no school", () => {
    const daily = buildDailySchedule(TEST_CONFIG, "2026-09-19", 6); // Saturday
    assert.equal(daily.noSchool, true);
    assert.equal(daily.blocks.length, 0);
});

test("buildBlocks keeps explicit passing periods", () => {
    const blocks = buildBlocks([
        { name: "A", start: "08:00", end: "08:30", kind: "passing" },
        { name: "B", start: "08:30", end: "09:00" }
    ]);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].kind, "passing");
});

/* ---------------- computeState ---------------- */

test("before-school state before the first period", () => {
    const { snapshot } = resolve("2026-09-18", 5, 7 * 60); // 07:00
    assert.equal(snapshot.stateKey, "before-school");
    assert.equal(snapshot.stateLabel, "Before School");
    assert.equal(snapshot.currentBlock, null);
    assert.equal(snapshot.nextBlock.name, "Homeroom");
});

test("in-period state with progress at the midpoint", () => {
    // Period 1: 08:25-09:15. At 08:50, 25 of 50 minutes have passed.
    const { snapshot } = resolve("2026-09-18", 5, 8 * 60 + 50);
    assert.equal(snapshot.stateKey, "in-period");
    assert.equal(snapshot.stateLabel, "Period 1");
    assert.equal(snapshot.currentBlock.name, "Period 1");
    assert.equal(snapshot.progress.percentage, 50);
    assert.ok(Math.abs(snapshot.progress.elapsedMinutes - 25) < 0.01);
    assert.ok(Math.abs(snapshot.progress.remainingMinutes - 25) < 0.01);
});

test("passing period between classes", () => {
    // Gap between Period 1 (ends 09:15) and Period 2 (starts 09:20).
    const { snapshot } = resolve("2026-09-18", 5, 9 * 60 + 17);
    assert.equal(snapshot.stateKey, "in-passing");
    assert.equal(snapshot.stateLabel, "Passing Period");
    assert.equal(snapshot.currentBlock.kind, "passing");
    assert.equal(snapshot.nextBlock.name, "Period 2");
    assert.equal(snapshot.nextStartInSeconds, 3 * 60);
});

test("lunch state", () => {
    const { snapshot } = resolve("2026-09-18", 5, 10 * 60 + 20);
    assert.equal(snapshot.stateKey, "in-lunch");
    assert.equal(snapshot.stateLabel, "Lunch");
    assert.equal(snapshot.currentBlock.name, "Lunch");
});

test("after-school state after the last block", () => {
    const { snapshot } = resolve("2026-09-18", 5, 15 * 60); // 15:00
    assert.equal(snapshot.stateKey, "after-school");
    assert.equal(snapshot.stateLabel, "After School");
    assert.equal(snapshot.nextBlock, null);
});

test("no-school snapshot has no blocks or progress", () => {
    const daily = buildDailySchedule(TEST_CONFIG, "2026-09-21", 1);
    const snapshot = computeState(daily.blocks, 8 * 60);
    assert.equal(snapshot.stateKey, "no-school");
    assert.equal(snapshot.currentBlock, null);
    assert.equal(snapshot.progress, null);
});

test("next period and countdown while before school", () => {
    const { snapshot } = resolve("2026-09-18", 5, 7 * 60 + 45);
    assert.equal(snapshot.nextBlock.name, "Homeroom");
    assert.equal(snapshot.nextStartInSeconds, 15 * 60);
});

test("progress clamps during a block boundary", () => {
    // Right at a block's start the percentage is 0.
    const { snapshot } = resolve("2026-09-18", 5, 8 * 60 + 25);
    assert.equal(snapshot.progress.percentage, 0);
});

/* ---------------- configuration validation ---------------- */

test("valid config passes validation", () => {
    const result = validateConfig(JSON.parse(JSON.stringify(TEST_CONFIG)));
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("invalid config: period ends before it starts", () => {
    const bad = structuredClone(TEST_CONFIG);
    bad.schedules.regular.periods[1].end = "08:10";
    const result = validateConfig(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((m) => m.includes("ends before it starts")));
});

test("invalid config: duplicate start times", () => {
    const bad = structuredClone(TEST_CONFIG);
    bad.schedules.regular.periods.splice(2, 0, {
        name: "Period X",
        start: "08:25",
        end: "08:50"
    });
    const result = validateConfig(bad);
    assert.equal(result.valid, false);
    assert.ok(
        result.errors.some((m) => m.includes("starts at the same time"))
    );
});

test("invalid config: overlapping periods", () => {
    const bad = structuredClone(TEST_CONFIG);
    bad.schedules.regular.periods[1].end = "10:00"; // overlaps Lun
    const result = validateConfig(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((m) => m.includes("overlaps")));
});

test("invalid config: malformed time", () => {
    const bad = structuredClone(TEST_CONFIG);
    bad.schedules.regular.periods[1].start = "25:99";
    const result = validateConfig(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((m) => m.includes("invalid start time")));
});

test("invalid config: missing schedule reference in calendar", () => {
    const bad = structuredClone(TEST_CONFIG);
    bad.calendar["2026-10-02"].schedule = "does-not-exist";
    const result = validateConfig(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((m) => m.includes("does not exist")));
});

test("invalid config: invalid timezone", () => {
    const bad = structuredClone(TEST_CONFIG);
    bad.settings.timezone = "Mars/Olympus";
    const result = validateConfig(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((m) => m.includes("not a valid IANA timezone")));
});

test("invalid config: bad calendar date", () => {
    const bad = structuredClone(TEST_CONFIG);
    bad.calendar["2026-13-01"] = { type: "no-school" };
    const result = validateConfig(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((m) => m.includes("not a valid date")));
});

test("invalid config: no schedules at all", () => {
    const result = validateConfig({ school: { name: "X" } });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((m) => m.includes("at least one schedule")));
});

test("invalid config: empty schedule preset", () => {
    const bad = structuredClone(TEST_CONFIG);
    bad.schedules.regular.periods = [];
    const result = validateConfig(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((m) => m.includes("has no periods")));
});

test("legacy config: top-level schedule array migrates to regular preset", () => {
    const legacy = {
        school: { name: "Old School" },
        schedule: [
            { name: "Period 1", start: "08:00", end: "09:00" }
        ]
    };
    const config = normalizeConfig(legacy);
    assert.ok(config.schedules.regular);
    assert.equal(config.schedules.regular.periods.length, 1);
    assert.equal(legacy.schedule, undefined);
});