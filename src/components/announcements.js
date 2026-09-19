/**
 * Announcements panel.
 *
 * Designed to stay modular: each announcement may carry optional "from" /
 * "until" calendar-date windows, and a "rotate" flag that cycles a single
 * announcement per day. Future features (rotating pools, scheduling, tags)
 * belong here, not in the dashboard orchestrator.
 */

import { qs, setText, clear, createElement, toggleHidden } from "../utils/dom.js";

function isActiveOn(announcement, dateKey) {
    if (announcement.from && dateKey < announcement.from) {
        return false;
    }
    if (announcement.until && dateKey > announcement.until) {
        return false;
    }
    return true;
}

/**
 * Apply date windows and rotate flags. Returns the list of announcements
 * that are visible on the given day.
 */
export function resolveAnnouncements(list, dateKey) {
    const active = (list || []).filter(
        (item) => !item.hidden && isActiveOn(item, dateKey)
    );

    const rotating = active.filter((item) => item.rotate);
    const fixed = active.filter((item) => !item.rotate);

    if (rotating.length === 0) {
        return fixed;
    }

    // Pick one rotating announcement per (day of year) so the shown item
    // changes daily without a database or timers.
    const dayOfYear = new Date(`${dateKey}T12:00:00`);
    const start = new Date(dayOfYear.getFullYear(), 0, 1);
    const index =
        Math.floor((dayOfYear - start) / 86400000) % rotating.length;

    return [...fixed, rotating[index]];
}

export function renderAnnouncements({ config, time }) {
    const panel = qs("#announcements-panel");
    const container = qs("#announcements");

    const items = resolveAnnouncements(config.announcements, time.dateKey);

    if (!config.settings.showAnnouncements || items.length === 0) {
        toggleHidden(panel, true);
        return;
    }

    toggleHidden(panel, false);
    clear(container);

    for (const announcement of items) {
        const article = createElement("article", "announcement");
        const title = createElement("h4", "announcement-title", announcement.title);
        const message = createElement("p", "announcement-message", announcement.message);
        article.appendChild(title);
        article.appendChild(message);
        container.appendChild(article);
    }
}