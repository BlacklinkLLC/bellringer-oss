/**
 * School status badge (header) + screen-reader announcements.
 *
 * The badge shows a glanceable day state such as "In Session", "Passing" or
 * "No School". The audible update only fires when the state actually changes,
 * so assistive technology is not spammed every second.
 */

import { qs, setText, announce } from "../utils/dom.js";

const BADGE_LABELS = {
    "before-school": "Before School",
    "in-period": "In Session",
    "in-lunch": "Lunch",
    "in-passing": "Passing",
    "after-school": "After School",
    "no-school": "No School"
};

export function renderSchoolStatus({ config, snapshot }) {
    const badge = qs("#status-badge");
    const text = qs("#status-text");
    const hidden = !config.settings.showStatus;

    if (!badge) {
        return;
    }

    if (hidden) {
        badge.hidden = true;
        return;
    }

    badge.hidden = false;
    badge.dataset.state = snapshot.stateKey;
    setText(text, BADGE_LABELS[snapshot.stateKey] || snapshot.stateLabel);

    const message = snapshot.currentBlock
        ? `Now: ${snapshot.stateLabel}.`
        : `Schedule status: ${snapshot.stateLabel}.`;
    announce(message, qs("#aria-status"));
}