/**
 * Widget host: turns a layout into live widgets inside a grid container.
 *
 *   const host = createHost({ container, onAction });
 *   host.sync(layout, { editing, displayOnly });   // when the layout changes
 *   host.tick(ctx);                                // every second
 *
 * The host owns the wrapper element (grid span, edit toolbar); each widget
 * owns its own contents. A widget that throws is isolated and shows an inline
 * error, so one bad widget can never blank the dashboard.
 */

import { createElement } from "../utils/dom.js";
import { createIcon } from "../utils/icons.js";
import { getWidget } from "./registry.js";
import { normalizeConfig } from "./schema.js";
import { SIZES } from "./layout.js";

function button(label, text, onClick, extraClass = "") {
    const el = createElement(
        "button",
        `widget-btn btn ${extraClass || "btn-subtle"}`.trim(),
        text
    );
    el.type = "button";
    el.setAttribute("aria-label", label);
    el.title = label;
    el.addEventListener("click", onClick);
    return el;
}

function buildToolbar(item, widget, index, count, onAction) {
    const bar = createElement("div", "widget-toolbar");
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", `${widget.name} widget controls`);

    const name = createElement("span", "widget-toolbar-name");
    if (widget.icon) {
        name.appendChild(createIcon(widget.icon));
    }
    name.appendChild(createElement("span", "", widget.name));

    const earlier = button(`Move ${widget.name} earlier`, "←", () =>
        onAction({ id: item.id, action: "move", value: -1 })
    );
    earlier.disabled = index === 0;
    const later = button(`Move ${widget.name} later`, "→", () =>
        onAction({ id: item.id, action: "move", value: 1 })
    );
    later.disabled = index === count - 1;

    const size = createElement("select", "widget-size");
    size.setAttribute("aria-label", `${widget.name} width`);
    for (const [key, info] of Object.entries(SIZES)) {
        const option = createElement("option", "", info.label);
        option.value = key;
        option.selected = key === item.size;
        size.appendChild(option);
    }
    size.addEventListener("change", () =>
        onAction({ id: item.id, action: "resize", value: size.value })
    );

    bar.append(name, earlier, later, size);

    if (Object.keys(widget.schema).length) {
        const settings = button(`${widget.name} settings`, "", () =>
            onAction({ id: item.id, action: "configure" })
        );
        settings.append(createIcon("Settings"), createElement("span", "", "Settings"));
        bar.appendChild(settings);
    }

    bar.appendChild(
        button(`Remove ${widget.name}`, "Remove", () => onAction({ id: item.id, action: "remove" }), "btn-danger")
    );
    return bar;
}

export function createHost({ container, onAction }) {
    const entries = new Map(); // id -> { key, type, wrapper, instance, config }
    let lastCtx = null;

    function build(item, widget, config) {
        const instance = widget.create(config);
        const wrapper = createElement("div", "widget");
        wrapper.dataset.type = item.type;
        wrapper.dataset.id = item.id;
        wrapper.appendChild(instance.element);
        return { instance, wrapper, config, key: JSON.stringify(config), type: item.type };
    }

    function sync(layout, { editing = false, displayOnly = false } = {}) {
        const visible = layout.filter((item) => {
            const widget = getWidget(item.type);
            return widget && (!displayOnly || widget.display);
        });
        const liveIds = new Set(visible.map((item) => item.id));

        for (const [id, entry] of entries) {
            if (!liveIds.has(id)) {
                if (entry.instance.destroy) {
                    entry.instance.destroy();
                }
                entry.wrapper.remove();
                entries.delete(id);
            }
        }

        container.classList.toggle("is-editing", editing);

        visible.forEach((item, index) => {
            const widget = getWidget(item.type);
            const config = normalizeConfig(widget.schema, item.config);
            let entry = entries.get(item.id);

            // New widget, or its settings changed: rebuild it.
            if (!entry || entry.key !== JSON.stringify(config)) {
                if (entry) {
                    entry.wrapper.remove();
                }
                entry = build(item, widget, config);
                entries.set(item.id, entry);
            }

            entry.config = config;
            entry.wrapper.style.gridColumn = `span ${SIZES[item.size].columns}`;

            const oldBar = entry.wrapper.querySelector(".widget-toolbar");
            if (oldBar) {
                oldBar.remove();
            }
            if (editing) {
                entry.wrapper.prepend(buildToolbar(item, widget, index, visible.length, onAction));
            }

            container.appendChild(entry.wrapper); // (re)order
        });

        if (lastCtx) {
            tick(lastCtx);
        }
    }

    function tick(ctx) {
        lastCtx = ctx;
        for (const entry of entries.values()) {
            try {
                entry.instance.update(ctx, entry.config);
                entry.wrapper.classList.toggle("is-empty", entry.instance.element.hidden);
                entry.wrapper.classList.remove("has-error");
            } catch (error) {
                entry.wrapper.classList.add("has-error");
                console.warn(`Widget "${entry.type}" failed to update:`, error);
            }
        }
    }

    /** Put keyboard focus back on a toolbar control after the layout re-renders. */
    function focusControl(id, selector) {
        const entry = entries.get(id);
        const target = entry && entry.wrapper.querySelector(selector);
        if (target && !target.disabled) {
            target.focus();
        }
    }

    return { sync, tick, focusControl };
}
