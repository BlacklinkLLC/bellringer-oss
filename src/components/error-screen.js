/**
 * Error screen.
 *
 * Rendered in place of the dashboard when configuration is missing, malformed
 * or invalid, so the page never goes blank or crashes with an obscure error.
 */

import { createElement, qs, clear, setText } from "../utils/dom.js";

export function showErrorScreen({ title = "BellRinger failed to load", messages = [] } = {}) {
    const root = qs("body");
    clear(root);

    const skip = createElement("a", "skip-link", "Skip to content");
    skip.href = "#error-content";

    const main = createElement("main", "error-screen");
    main.id = "error-content";
    main.tabIndex = -1;

    const h1 = createElement("h1", "error-title", title);
    const lead = createElement(
        "p",
        "error-lead",
        "Check the configuration file and server logs, then reload the page."
    );

    main.appendChild(h1);
    main.appendChild(lead);

    if (messages.length) {
        const list = createElement("ul", "error-list");
        for (const message of messages) {
            const item = createElement("li", "error-item", message);
            list.appendChild(item);
        }
        main.appendChild(list);
    }

    root.appendChild(skip);
    root.appendChild(main);

    if (console && console.error) {
        for (const message of messages) {
            console.error(message);
        }
    }
}

export function isErrorScreenVisible() {
    return Boolean(document.querySelector(".error-screen"));
}