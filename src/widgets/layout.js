/**
 * Dashboard layout: an ordered list of widget instances.
 *
 *   { id: "w1", type: "current-period", size: "full", config: { … } }
 *
 * Widgets flow left-to-right on a 12-column grid and wrap, so a layout is just
 * an ordered list plus a width per widget. Everything here is a pure function
 * over plain data (no DOM, no storage), which keeps it easy to test and means
 * a layout can live in config.json, localStorage, or an exported file.
 */

export const SIZES = {
    third: { columns: 4, label: "Small (1/3)" },
    half: { columns: 6, label: "Medium (1/2)" },
    "two-thirds": { columns: 8, label: "Large (2/3)" },
    full: { columns: 12, label: "Full width" }
};

export const DEFAULT_LAYOUT = [
    { id: "w1", type: "current-period", size: "full", config: {} },
    { id: "w2", type: "schedule", size: "two-thirds", config: {} },
    { id: "w3", type: "announcements", size: "third", config: {} }
];

export const MAX_WIDGETS = 24;

function cleanItem(item, knownTypes) {
    if (!item || typeof item !== "object" || !knownTypes.includes(item.type)) {
        return null;
    }
    return {
        id: typeof item.id === "string" && item.id ? item.id.slice(0, 40) : "",
        type: item.type,
        size: SIZES[item.size] ? item.size : null,
        config: item.config && typeof item.config === "object" ? { ...item.config } : {}
    };
}

/**
 * Drop unknown widget types, repair ids and sizes, cap the length.
 * `defaultSizeFor(type)` supplies the size when an item has none.
 */
export function normalizeLayout(raw, knownTypes, defaultSizeFor = () => "half") {
    if (!Array.isArray(raw)) {
        return [];
    }
    const seen = new Set();
    const out = [];

    for (const entry of raw) {
        const item = cleanItem(entry, knownTypes);
        if (!item || out.length >= MAX_WIDGETS) {
            continue;
        }
        if (!item.id || seen.has(item.id)) {
            item.id = nextId(out, item.type);
        }
        item.size = item.size || defaultSizeFor(item.type);
        seen.add(item.id);
        out.push(item);
    }
    return out;
}

export function nextId(layout, type) {
    const used = new Set(layout.map((item) => item.id));
    let n = layout.length + 1;
    while (used.has(`${type}-${n}`)) {
        n += 1;
    }
    return `${type}-${n}`;
}

export function addWidget(layout, type, size, config = {}) {
    if (layout.length >= MAX_WIDGETS) {
        return layout;
    }
    return [...layout, { id: nextId(layout, type), type, size, config }];
}

export function removeWidget(layout, id) {
    return layout.filter((item) => item.id !== id);
}

/** Move a widget earlier (-1) or later (+1) in the order. */
export function moveWidget(layout, id, delta) {
    const from = layout.findIndex((item) => item.id === id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= layout.length) {
        return layout;
    }
    const next = layout.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

export function resizeWidget(layout, id, size) {
    if (!SIZES[size]) {
        return layout;
    }
    return layout.map((item) => (item.id === id ? { ...item, size } : item));
}

export function updateWidgetConfig(layout, id, config) {
    return layout.map((item) => (item.id === id ? { ...item, config: { ...config } } : item));
}
