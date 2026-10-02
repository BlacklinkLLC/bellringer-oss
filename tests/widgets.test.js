/**
 * Tests for the widget system's pure logic: schemas, layout operations,
 * appearance preferences, and the small parsers the built-in widgets use.
 *
 * Run with: npm test
 */

import test from "node:test";
import assert from "node:assert/strict";

import { normalizeConfig, assertValidSchema, coerceValue } from "../src/widgets/schema.js";
import {
    DEFAULT_LAYOUT,
    MAX_WIDGETS,
    addWidget,
    moveWidget,
    normalizeLayout,
    removeWidget,
    resizeWidget,
    updateWidgetConfig
} from "../src/widgets/layout.js";
import { normalizePrefs, resolveAccent, contrastInk, hexToRgba, DEFAULT_PREFS } from "../src/widgets/prefs.js";
import { parseLinks } from "../src/widgets/builtin/links.js";
import { daysBetween } from "../src/widgets/builtin/helpers.js";
import { normalizeConfig as normalizeSchoolConfig } from "../src/config/defaults.js";

const TYPES = ["current-period", "schedule", "announcements", "note"];

/* ---------------- schema ---------------- */

test("normalizeConfig fills defaults, coerces values and drops unknown keys", () => {
    const schema = {
        show: { type: "boolean", default: true },
        count: { type: "number", default: 5, min: 1, max: 10 },
        mode: { type: "select", options: ["a", "b"], default: "a" },
        title: { type: "string", default: "Hi", maxLength: 5 }
    };
    assert.deepEqual(normalizeConfig(schema, {}), { show: true, count: 5, mode: "a", title: "Hi" });
    assert.deepEqual(
        normalizeConfig(schema, { show: "true", count: 99, mode: "zzz", title: "toolongtitle", evil: 1 }),
        { show: true, count: 10, mode: "a", title: "toolo" }
    );
    assert.equal(normalizeConfig(schema, { count: "abc" }).count, 5);
});

test("date and color fields reject malformed values", () => {
    assert.equal(coerceValue({ type: "date" }, "2026-12-25"), "2026-12-25");
    assert.equal(coerceValue({ type: "date" }, "12/25/2026"), "");
    assert.equal(coerceValue({ type: "color", default: "#ffb020" }, "red"), "#ffb020");
    assert.equal(coerceValue({ type: "color", default: "#ffb020" }, "#00ff00"), "#00ff00");
});

test("assertValidSchema rejects unsupported types and empty selects", () => {
    assert.throws(() => assertValidSchema("x", { a: { type: "nope" } }));
    assert.throws(() => assertValidSchema("x", { a: { type: "select", options: [] } }));
    assert.doesNotThrow(() => assertValidSchema("x", { a: { type: "boolean" } }));
});

/* ---------------- layout ---------------- */

test("normalizeLayout drops unknown types, repairs ids and sizes", () => {
    const layout = normalizeLayout(
        [
            { id: "a", type: "schedule", size: "full" },
            { id: "a", type: "note", size: "bogus" }, // duplicate id + bad size
            { type: "not-a-widget" },
            null,
            { type: "announcements" } // no id, no size
        ],
        TYPES,
        () => "third"
    );
    assert.equal(layout.length, 3);
    assert.equal(new Set(layout.map((i) => i.id)).size, 3);
    assert.equal(layout[1].size, "third");
    assert.equal(layout[2].size, "third");
});

test("normalizeLayout tolerates garbage and caps the length", () => {
    assert.deepEqual(normalizeLayout("nope", TYPES), []);
    assert.deepEqual(normalizeLayout(null, TYPES), []);
    const many = Array.from({ length: 50 }, () => ({ type: "note" }));
    assert.equal(normalizeLayout(many, TYPES).length, MAX_WIDGETS);
});

test("the default layout is valid for the built-in widget types", () => {
    assert.equal(normalizeLayout(DEFAULT_LAYOUT, TYPES).length, DEFAULT_LAYOUT.length);
});

test("add / move / resize / remove / update are pure and safe", () => {
    const base = normalizeLayout(DEFAULT_LAYOUT, TYPES);
    const ids = (l) => l.map((i) => i.id).join(",");

    const added = addWidget(base, "note", "third", { text: "hi" });
    assert.equal(added.length, base.length + 1);
    assert.equal(base.length, DEFAULT_LAYOUT.length, "input not mutated");
    assert.equal(new Set(added.map((i) => i.id)).size, added.length);

    assert.equal(ids(moveWidget(base, base[0].id, -1)), ids(base), "can't move first item earlier");
    assert.equal(moveWidget(base, base[0].id, 1)[1].id, base[0].id);
    assert.equal(ids(moveWidget(base, "missing", 1)), ids(base));

    assert.equal(resizeWidget(base, base[1].id, "half")[1].size, "half");
    assert.equal(resizeWidget(base, base[1].id, "huge")[1].size, base[1].size);

    assert.equal(removeWidget(base, base[0].id).length, base.length - 1);
    assert.deepEqual(updateWidgetConfig(base, base[0].id, { a: 1 })[0].config, { a: 1 });
});

test("addWidget refuses to exceed the widget cap", () => {
    let layout = [];
    for (let i = 0; i < MAX_WIDGETS + 5; i += 1) {
        layout = addWidget(layout, "note", "third");
    }
    assert.equal(layout.length, MAX_WIDGETS);
});

/* ---------------- appearance prefs ---------------- */

test("normalizePrefs falls back to defaults for anything invalid", () => {
    assert.deepEqual(normalizePrefs(null), DEFAULT_PREFS);
    const prefs = normalizePrefs({ theme: "neon", accent: "mint", density: "compact", customAccent: "nope" });
    assert.equal(prefs.theme, "default");
    assert.equal(prefs.accent, "mint");
    assert.equal(prefs.density, "compact");
    assert.equal(prefs.customAccent, DEFAULT_PREFS.customAccent);
});

test("resolveAccent picks the right variant for the theme", () => {
    assert.equal(resolveAccent({ accent: "default" }, "dark"), null);
    assert.notEqual(resolveAccent({ accent: "sky" }, "dark"), resolveAccent({ accent: "sky" }, "light"));
    assert.equal(resolveAccent({ accent: "custom", customAccent: "#123456" }, "dark"), "#123456");
});

test("contrastInk and hexToRgba", () => {
    assert.equal(contrastInk("#ffb020"), "#201e19"); // light accent -> dark text
    assert.equal(contrastInk("#5b3fc4"), "#ffffff"); // dark accent -> light text
    assert.equal(hexToRgba("#ff0000", 0.5), "rgba(255, 0, 0, 0.5)");
});

/* ---------------- widget helpers ---------------- */

test("parseLinks keeps only http(s) links and trims labels", () => {
    const links = parseLinks(
        [
            "Grades | https://example.com/grades",
            "Bad | javascript:alert(1)",
            "File | file:///etc/passwd",
            "NoUrl |",
            "| https://nolabel.example",
            "Mail | mailto:a@b.c",
            "  Lunch menu  |  http://example.com/menu?a=1|2 "
        ].join("\n")
    );
    assert.deepEqual(
        links.map((l) => l.label),
        ["Grades", "Lunch menu"]
    );
    assert.ok(links.every((l) => /^https?:/.test(l.href)));
});

test("daysBetween counts calendar days across month boundaries", () => {
    assert.equal(daysBetween("2026-10-01", "2026-10-01"), 0);
    assert.equal(daysBetween("2026-10-01", "2026-12-23"), 83);
    assert.equal(daysBetween("2026-10-05", "2026-10-01"), -4);
    assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
});

/* ---------------- config ---------------- */

test("normalizeConfig passes through an optional layout and the cdnIcons setting", () => {
    const withLayout = normalizeSchoolConfig({ layout: [{ type: "clock" }] });
    assert.deepEqual(withLayout.layout, [{ type: "clock" }]);
    assert.equal(withLayout.settings.cdnIcons, true);
    assert.equal(normalizeSchoolConfig({}).layout, null);
    assert.equal(normalizeSchoolConfig({ settings: { cdnIcons: false } }).settings.cdnIcons, false);
});
