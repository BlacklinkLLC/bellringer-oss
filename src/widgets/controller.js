/**
 * Widget controller: owns the layout + appearance state, persists it, drives
 * the host, and builds the customize dialog.
 *
 * Layout precedence: this device's saved layout, else `layout` in config.json,
 * else the built-in default. Appearance is always per-device.
 */

import { createElement, setText, clear } from "../utils/dom.js";
import { createIcon } from "../utils/icons.js";
import { isDisplayMode } from "../theme/display-mode.js";
import { createHost } from "./host.js";
import { getWidget, listWidgets, widgetTypes, defaultConfigFor } from "./registry.js";
import { normalizeConfig } from "./schema.js";
import {
    DEFAULT_LAYOUT,
    MAX_WIDGETS,
    SIZES,
    addWidget,
    moveWidget,
    normalizeLayout,
    removeWidget,
    resizeWidget,
    updateWidgetConfig
} from "./layout.js";
import { ACCENTS, DEFAULT_PREFS, normalizePrefs } from "./prefs.js";
import { applyPrefs } from "./appearance.js";
import * as store from "./storage.js";

const THEME_CHOICES = [
    ["default", "School default"],
    ["system", "Match this device"],
    ["light", "Light"],
    ["dark", "Dark"]
];

export function createController({ config, container, openButton }) {
    const displayMode = isDisplayMode();
    const defaultSize = (type) => (getWidget(type) ? getWidget(type).defaultSize : "half");

    const schoolLayout = () => {
        const fromConfig = normalizeLayout(config.layout, widgetTypes(), defaultSize);
        return fromConfig.length
            ? fromConfig
            : normalizeLayout(DEFAULT_LAYOUT, widgetTypes(), defaultSize);
    };

    const saved = normalizeLayout(store.loadSavedLayout(), widgetTypes(), defaultSize);
    const state = {
        layout: saved.length ? saved : schoolLayout(),
        prefs: normalizePrefs(store.loadSavedPrefs()),
        editing: false,
        view: "main", // "main" | "widget"
        configuringId: null
    };

    const host = createHost({ container, onAction: handleAction });
    let dialog = null;
    let body = null;
    let editBar = null;
    let message = null;

    /* ---------------- state changes ---------------- */

    function commitLayout(next, focus) {
        state.layout = next;
        store.saveLayout(next);
        host.sync(state.layout, { editing: state.editing, displayOnly: displayMode });
        if (focus) {
            host.focusControl(focus.id, focus.selector);
        }
        renderDialog();
    }

    function commitPrefs(next) {
        state.prefs = normalizePrefs(next);
        store.savePrefs(state.prefs);
        applyPrefs(state.prefs, config.settings.theme);
        renderDialog();
    }

    function setEditing(on) {
        state.editing = on;
        editBar.hidden = !on;
        host.sync(state.layout, { editing: on, displayOnly: displayMode });
    }

    function handleAction({ id, action, value }) {
        if (action === "move") {
            commitLayout(moveWidget(state.layout, id, value), {
                id,
                selector: `button[aria-label^="Move"][aria-label$="${value < 0 ? "earlier" : "later"}"]`
            });
        } else if (action === "resize") {
            commitLayout(resizeWidget(state.layout, id, value), { id, selector: ".widget-size" });
        } else if (action === "remove") {
            commitLayout(removeWidget(state.layout, id));
        } else if (action === "configure") {
            state.view = "widget";
            state.configuringId = id;
            openDialog();
        }
    }

    /* ---------------- dialog building blocks ---------------- */

    let fieldCounter = 0;

    function field(labelText, control, hint) {
        const wrap = createElement("div", "field");
        const id = `field-${(fieldCounter += 1)}`;
        control.id = id;
        const label = createElement("label", "", labelText);
        label.htmlFor = id;
        wrap.append(label, control);
        if (hint) {
            wrap.appendChild(createElement("p", "form-hint", hint));
        }
        return wrap;
    }

    // NOVA's toggle-item: a bordered row with a checkbox.
    function checkbox(labelText, checked, onChange) {
        const wrap = createElement("label", "toggle-item");
        wrap.classList.toggle("checked", checked);
        const input = createElement("input");
        input.type = "checkbox";
        input.checked = checked;
        input.addEventListener("change", () => {
            wrap.classList.toggle("checked", input.checked);
            onChange(input.checked);
        });
        wrap.append(input, createElement("span", "", labelText));
        return wrap;
    }

    function select(options, value, onChange) {
        const el = createElement("select");
        for (const [optionValue, label] of options) {
            const option = createElement("option", "", label);
            option.value = optionValue;
            option.selected = optionValue === value;
            el.appendChild(option);
        }
        el.addEventListener("change", () => onChange(el.value));
        return el;
    }

    function section(title, iconName) {
        const el = createElement("section", "customize-section");
        const heading = createElement("h3", "customize-heading");
        if (iconName) {
            heading.appendChild(createIcon(iconName));
        }
        heading.appendChild(createElement("span", "", title));
        el.appendChild(heading);
        return el;
    }

    // NOVA button variants: btn-primary, btn-secondary, btn-subtle, btn-danger.
    const BUTTON_VARIANTS = {
        "btn-primary": "btn btn-primary",
        "btn-danger": "btn btn-danger",
        "btn-link": "btn btn-subtle"
    };

    function actionButton(text, onClick, variant = "") {
        const el = createElement("button", BUTTON_VARIANTS[variant] || "btn btn-secondary", text);
        el.type = "button";
        el.addEventListener("click", onClick);
        return el;
    }

    function say(text) {
        setText(message, text);
    }

    /* ---------------- dialog views ---------------- */

    function layoutSection() {
        const el = section("Widgets", "Blocks");
        el.appendChild(
            createElement(
                "p",
                "form-hint",
                `${state.layout.length} of ${MAX_WIDGETS} on this screen. ` +
                    "Choose Edit layout to move, resize, configure or remove them."
            )
        );
        el.appendChild(
            actionButton("Edit layout on the page", () => {
                dialog.close();
                setEditing(true);
            }, "btn-primary")
        );

        const list = createElement("ul", "catalog");
        for (const widget of listWidgets()) {
            const item = createElement("li", "catalog-item");
            const text = createElement("div", "catalog-text");
            const name = createElement("strong", "");
            if (widget.icon) {
                name.appendChild(createIcon(widget.icon));
            }
            name.appendChild(createElement("span", "", widget.name));
            text.append(name, createElement("p", "", widget.description));

            const add = actionButton("Add", () => {
                commitLayout(
                    addWidget(state.layout, widget.id, widget.defaultSize, defaultConfigFor(widget.id))
                );
                say(`${widget.name} added.`);
            });
            add.setAttribute("aria-label", `Add ${widget.name}`);
            add.disabled = state.layout.length >= MAX_WIDGETS;
            item.append(text, add);
            list.appendChild(item);
        }
        el.appendChild(list);
        return el;
    }

    function accentPicker() {
        const group = createElement("div", "swatches");
        group.setAttribute("role", "radiogroup");
        group.setAttribute("aria-label", "Accent color");

        const choices = [
            ["default", "School default", null],
            ...Object.entries(ACCENTS).map(([key, a]) => [key, a.label, a.dark])
        ];
        for (const [key, label, color] of choices) {
            const wrap = createElement("label", "swatch");
            const input = createElement("input");
            input.type = "radio";
            input.name = "accent";
            input.checked = state.prefs.accent === key;
            input.addEventListener("change", () => commitPrefs({ ...state.prefs, accent: key }));
            const dot = createElement("span", "swatch-dot");
            if (color) {
                dot.style.background = color;
            } else {
                dot.classList.add("is-default");
            }
            wrap.append(input, dot, createElement("span", "swatch-label", label));
            group.appendChild(wrap);
        }

        const custom = createElement("label", "swatch");
        const radio = createElement("input");
        radio.type = "radio";
        radio.name = "accent";
        radio.checked = state.prefs.accent === "custom";
        radio.addEventListener("change", () => commitPrefs({ ...state.prefs, accent: "custom" }));
        const picker = createElement("input", "swatch-color");
        picker.type = "color";
        picker.value = state.prefs.customAccent;
        picker.setAttribute("aria-label", "Custom accent color");
        picker.addEventListener("input", () =>
            commitPrefs({ ...state.prefs, accent: "custom", customAccent: picker.value })
        );
        custom.append(radio, picker, createElement("span", "swatch-label", "Custom"));
        group.appendChild(custom);
        return group;
    }

    function appearanceSection() {
        const el = section("Appearance", "Brush");
        const p = state.prefs;

        el.appendChild(
            field("Theme", select(THEME_CHOICES, p.theme, (v) => commitPrefs({ ...p, theme: v })))
        );
        const accentWrap = createElement("div", "customize-group");
        accentWrap.appendChild(createElement("span", "form-label", "Accent color"));
        accentWrap.appendChild(accentPicker());
        el.appendChild(accentWrap);

        el.appendChild(
            field(
                "Density",
                select(
                    [["comfortable", "Comfortable"], ["compact", "Compact"]],
                    p.density,
                    (v) => commitPrefs({ ...p, density: v })
                )
            )
        );
        el.appendChild(
            field(
                "Heading style",
                select(
                    [["serif", "Serif (italic)"], ["sans", "Sans-serif"]],
                    p.headingFont,
                    (v) => commitPrefs({ ...p, headingFont: v })
                )
            )
        );
        el.appendChild(
            checkbox("Reduce motion", p.reduceMotion, (v) => commitPrefs({ ...p, reduceMotion: v }))
        );
        return el;
    }

    function shareSection() {
        const el = section("Share & reset", "Preferences");
        el.appendChild(
            createElement(
                "p",
                "form-hint",
                "Copy this device's layout and appearance to another screen, or back it up."
            )
        );

        const box = createElement("textarea", "share-box");
        box.rows = 5;
        box.spellcheck = false;
        box.setAttribute("aria-label", "Layout and appearance as JSON");

        const row = createElement("div", "btn-row");
        row.append(
            actionButton("Export", () => {
                box.value = JSON.stringify({ version: 1, layout: state.layout, prefs: state.prefs }, null, 2);
                box.select();
                say("Exported. Copy the text above.");
            }),
            actionButton("Import", () => {
                try {
                    const data = JSON.parse(box.value);
                    const layout = normalizeLayout(data.layout, widgetTypes(), defaultSize);
                    if (!layout.length) {
                        throw new Error("no widgets");
                    }
                    state.prefs = normalizePrefs(data.prefs);
                    store.savePrefs(state.prefs);
                    applyPrefs(state.prefs, config.settings.theme);
                    commitLayout(layout);
                    say("Imported.");
                } catch {
                    say("That doesn't look like an exported layout.");
                }
            })
        );
        el.append(box, row);

        const reset = createElement("div", "btn-row");
        reset.append(
            actionButton("Reset layout", () => {
                store.clearSavedLayout();
                commitLayout(schoolLayout());
                say("Layout reset to the school default.");
            }, "btn-danger"),
            actionButton("Reset appearance", () => {
                store.clearSavedPrefs();
                commitPrefs(DEFAULT_PREFS);
                say("Appearance reset.");
            }, "btn-danger")
        );
        el.appendChild(reset);
        return el;
    }

    function widgetSettingsView() {
        const item = state.layout.find((entry) => entry.id === state.configuringId);
        const widget = item && getWidget(item.type);
        const wrap = createElement("div", "customize-view");

        const back = actionButton("← Back", () => {
            state.view = "main";
            state.configuringId = null;
            renderDialog();
        }, "btn-link");
        wrap.appendChild(back);

        if (!widget) {
            wrap.appendChild(createElement("p", "", "That widget no longer exists."));
            return wrap;
        }

        const heading = createElement("h3", "customize-heading");
        if (widget.icon) {
            heading.appendChild(createIcon(widget.icon));
        }
        heading.appendChild(createElement("span", "", `${widget.name} settings`));
        wrap.appendChild(heading);

        const current = normalizeConfig(widget.schema, item.config);
        const apply = (key, value) => {
            const next = { ...normalizeConfig(widget.schema, getItem().config), [key]: value };
            // Commit without re-rendering this form, so inputs keep focus while typing.
            state.layout = updateWidgetConfig(state.layout, item.id, next);
            store.saveLayout(state.layout);
            host.sync(state.layout, { editing: state.editing, displayOnly: displayMode });
        };
        const getItem = () => state.layout.find((entry) => entry.id === item.id);

        for (const [key, def] of Object.entries(widget.schema)) {
            if (def.type === "boolean") {
                wrap.appendChild(checkbox(def.label || key, current[key], (v) => apply(key, v)));
                continue;
            }
            let input;
            if (def.type === "select") {
                input = select(
                    def.options.map((o) => (typeof o === "object" ? [o.value, o.label] : [o, o])),
                    current[key],
                    (v) => apply(key, v)
                );
            } else {
                input = createElement(def.type === "textarea" ? "textarea" : "input");
                if (def.type === "textarea") {
                    input.rows = 5;
                } else {
                    input.type = { number: "number", color: "color", date: "date" }[def.type] || "text";
                }
                if (def.type === "number") {
                    if (Number.isFinite(def.min)) input.min = def.min;
                    if (Number.isFinite(def.max)) input.max = def.max;
                }
                if (def.maxLength) {
                    input.maxLength = def.maxLength;
                }
                input.value = current[key];
                input.addEventListener("input", () => apply(key, input.value));
            }
            wrap.appendChild(field(def.label || key, input));
        }
        return wrap;
    }

    function renderDialog() {
        if (!dialog) {
            return;
        }
        // Don't rebuild the form out from under someone typing in it.
        if (state.view === "widget" && dialog.open && body.contains(document.activeElement)) {
            return;
        }
        clear(body);
        if (state.view === "widget") {
            body.appendChild(widgetSettingsView());
        } else {
            body.append(layoutSection(), appearanceSection(), shareSection());
        }
    }

    function openDialog() {
        renderDialog();
        if (!dialog.open) {
            dialog.showModal();
        }
    }

    function buildDialog() {
        dialog = createElement("dialog", "customize-dialog");
        dialog.setAttribute("aria-labelledby", "customize-title");

        const header = createElement("header", "customize-header");
        const title = createElement("h2", "", "Customize");
        title.id = "customize-title";
        const close = actionButton("Done", () => dialog.close(), "btn-primary");
        header.append(title, close);

        body = createElement("div", "customize-body");
        message = createElement("p", "customize-message");
        message.setAttribute("role", "status");

        dialog.append(header, body, message);
        dialog.addEventListener("close", () => {
            state.view = "main";
            state.configuringId = null;
            say("");
            if (openButton) {
                openButton.focus();
            }
        });
        // Clicking the dimmed backdrop closes the drawer.
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) {
                dialog.close();
            }
        });
        document.body.appendChild(dialog);
    }

    function buildEditBar() {
        editBar = createElement("div", "edit-bar");
        editBar.hidden = true;
        editBar.setAttribute("role", "region");
        editBar.setAttribute("aria-label", "Layout editing");
        editBar.append(
            createElement("span", "edit-bar-text", "Editing layout"),
            actionButton("Add widget", () => {
                state.view = "main";
                openDialog();
            }),
            actionButton("Done", () => setEditing(false), "btn-primary")
        );
        document.body.appendChild(editBar);
    }

    /* ---------------- lifecycle ---------------- */

    function start() {
        applyPrefs(state.prefs, config.settings.theme);
        host.sync(state.layout, { editing: false, displayOnly: displayMode });

        if (displayMode) {
            if (openButton) {
                openButton.hidden = true;
            }
            return;
        }

        buildDialog();
        buildEditBar();
        if (openButton) {
            openButton.prepend(createIcon("Preferences"));
            openButton.hidden = false;
            openButton.addEventListener("click", () => {
                state.view = "main";
                openDialog();
            });
        }
    }

    return { start, tick: host.tick };
}
