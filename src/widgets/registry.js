/**
 * Widget registry.
 *
 * A widget definition is a plain object:
 *
 *   {
 *     id: "countdown",              // unique, kebab-case
 *     name: "Countdown",            // shown in the "add widget" list
 *     description: "…",
 *     defaultSize: "third",         // third | half | two-thirds | full
 *     display: false,               // true = also shown in TV display mode
 *     schema: { … },                // see schema.js
 *     create(config) { return { element, update(ctx, config) } }
 *   }
 *
 * `create` builds the widget's DOM once; `update` is called every tick with
 * the shared render context ({ config, time, daily, snapshot, upcoming }) and
 * should only touch the DOM when something actually changed.
 */

import { assertValidSchema, normalizeConfig } from "./schema.js";
import { SIZES } from "./layout.js";

const widgets = new Map();

export function registerWidget(definition) {
    const { id, name, create } = definition || {};
    if (!id || !name || typeof create !== "function") {
        throw new Error("Widget definitions need an id, a name and a create() function.");
    }
    if (widgets.has(id)) {
        throw new Error(`Widget "${id}" is already registered.`);
    }
    const schema = definition.schema || {};
    assertValidSchema(id, schema);

    const defaultSize = SIZES[definition.defaultSize] ? definition.defaultSize : "half";
    widgets.set(id, {
        description: "",
        display: false,
        ...definition,
        schema,
        defaultSize
    });
}

export function getWidget(id) {
    return widgets.get(id) || null;
}

export function listWidgets() {
    return Array.from(widgets.values());
}

export function widgetTypes() {
    return Array.from(widgets.keys());
}

export function defaultConfigFor(id) {
    const widget = widgets.get(id);
    return widget ? normalizeConfig(widget.schema, {}) : {};
}
