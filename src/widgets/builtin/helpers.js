/** Shared bits for the built-in widgets. */

import { createElement } from "../../utils/dom.js";
import { createIcon } from "../../utils/icons.js";

/** A standard panel with an optional heading and library icon. */
export function makePanel(className, headingText, iconName) {
    const root = createElement("section", `panel ${className}`);
    const heading = createElement("h3", "widget-title");
    if (iconName) {
        heading.appendChild(createIcon(iconName, "widget-title-icon"));
    }
    heading.appendChild(createElement("span", "widget-title-text", headingText || ""));
    heading.hidden = !headingText;
    root.appendChild(heading);
    return { root, heading };
}

export function setHeading(heading, text) {
    heading.querySelector(".widget-title-text").textContent = text;
    heading.hidden = !text;
}

/** Whole calendar days from one "YYYY-MM-DD" key to another. */
export function daysBetween(fromKey, toKey) {
    const parse = (key) => {
        const [y, m, d] = key.split("-").map(Number);
        return Date.UTC(y, m - 1, d);
    };
    return Math.round((parse(toKey) - parse(fromKey)) / 86400000);
}
