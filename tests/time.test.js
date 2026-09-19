/**
 * Tests for time and formatting utilities.
 *
 * Run with: npm test
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
    parseTimeToMinutes,
    getPartsInTimeZone,
    weekdayForDateKey
} from "../src/utils/time.js";
import {
    formatClockMinutes,
    formatTimeRange,
    formatDuration,
    formatCountdown,
    formatDateLabel
} from "../src/utils/format.js";

test("parseTimeToMinutes converts H:MM and HH:MM", () => {
    assert.equal(parseTimeToMinutes("08:25"), 505);
    assert.equal(parseTimeToMinutes("9:05"), 545);
    assert.equal(parseTimeToMinutes("00:00"), 0);
    assert.equal(parseTimeToMinutes("23:59"), 1439);
});

test("parseTimeToMinutes includes seconds as a fraction", () => {
    assert.equal(parseTimeToMinutes("08:00:30"), 480.5);
});

test("getPartsInTimeZone resolves a fixed instant in a named timezone", () => {
    // 2026-09-18T20:00:00Z = 15:00 CDT (America/Chicago, UTC-5 in September).
    const parts = getPartsInTimeZone(
        new Date("2026-09-18T20:00:00Z"),
        "America/Chicago"
    );
    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 9);
    assert.equal(parts.day, 18);
    assert.equal(parts.hour, 15);
    assert.equal(parts.minute, 0);
});

test("getPartsInTimeZone handles midnight correctly (hour 24 normalization)", () => {
    // 2026-09-19T05:00:00Z = 00:00 CDT next day.
    const parts = getPartsInTimeZone(
        new Date("2026-09-19T05:00:00Z"),
        "America/Chicago"
    );
    assert.equal(parts.day, 19);
    assert.equal(parts.hour, 0);
});

test("weekdayForDateKey returns 0-based weekday", () => {
    assert.equal(weekdayForDateKey("2026-09-18"), 5); // Friday
    assert.equal(weekdayForDateKey("2026-09-13"), 0); // Sunday
});

test("formatClockMinutes renders a 12-hour clock", () => {
    assert.equal(formatClockMinutes(505), "8:25 AM");
    assert.equal(formatClockMinutes(13 * 60 + 5), "1:05 PM");
});

test("formatTimeRange combines start and end", () => {
    assert.equal(formatTimeRange(505, 555), "8:25 AM – 9:15 AM");
});

test("formatDuration renders hours and minutes", () => {
    assert.equal(formatDuration(59), "59m");
    assert.equal(formatDuration(75), "1h 15m");
    assert.equal(formatDuration(120), "2h");
});

test("formatCountdown renders M:SS and H:MM", () => {
    assert.equal(formatCountdown(222), "3:42");
    assert.equal(formatCountdown(3725), "1h 02m");
    assert.equal(formatCountdown(-5), "0:00");
});

test("formatDateLabel renders a human date", () => {
    assert.equal(formatDateLabel("2026-09-18"), "Friday, September 18");
});

test("getPartsInTimeZone rejects unknown timezones", () => {
    assert.throws(() => getPartsInTimeZone(new Date(), "Not/AZone"));
});