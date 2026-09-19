/**
 * Small DOM helpers used by the dashboard components.
 * Event-free by design: components read the document directly.
 */

export function qs(selector, root = document) {
    return root.querySelector(selector);
}

export function setText(element, text) {
    element.textContent = text;
    return element;
}

export function clear(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
    return element;
}

export function toggleHidden(element, hidden) {
    element.hidden = hidden;
    return element;
}

/**
 * Create an element. Optionally set a class, text content and aria-live.
 */
export function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined && text !== null) {
        element.textContent = text;
    }
    return element;
}

/**
 * Speak a meaningful status string to screen readers.
 * Components call this only when the state actually changes,
 * so the live region stays quiet while the page updates every second.
 */
let lastAnnouncement = "";

export function announce(message, element, live = true) {
    if (message === lastAnnouncement) {
        return;
    }
    lastAnnouncement = message;
    const node = element || qs("#aria-status");
    if (node) {
        node.textContent = message;
        node.setAttribute("aria-live", live ? "polite" : "off");
    }
}