/**
 * Announcements. Each announcement may carry optional "from" / "until"
 * calendar-date windows and a "rotate" flag that cycles one announcement per
 * day (see resolveAnnouncements).
 */

import { createElement, clear } from "../../utils/dom.js";
import { makePanel, setHeading } from "./helpers.js";

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
 * Apply date windows and rotate flags. Returns the announcements visible on
 * the given day.
 */
export function resolveAnnouncements(list, dateKey) {
    const active = (list || []).filter((item) => !item.hidden && isActiveOn(item, dateKey));
    const rotating = active.filter((item) => item.rotate);
    const fixed = active.filter((item) => !item.rotate);

    if (rotating.length === 0) {
        return fixed;
    }

    // One rotating announcement per day-of-year: changes daily with no
    // database or timers.
    const day = new Date(`${dateKey}T12:00:00`);
    const start = new Date(day.getFullYear(), 0, 1);
    const index = Math.floor((day - start) / 86400000) % rotating.length;

    return [...fixed, rotating[index]];
}

export default {
    id: "announcements",
    name: "Announcements",
    description: "Messages from config.json, with optional date windows.",
    icon: "Announcement",
    defaultSize: "third",
    schema: {
        title: { type: "string", label: "Title", default: "Announcements", maxLength: 60 },
        maxItems: { type: "number", label: "Maximum shown", default: 6, min: 1, max: 12 }
    },

    create() {
        const { root, heading } = makePanel("announcements-panel", "Announcements", "Announcement");
        const container = createElement("div", "announcements");
        root.appendChild(container);
        let lastKey = "";

        return {
            element: root,
            update({ config: school, time }, config) {
                const items = resolveAnnouncements(school.announcements, time.dateKey).slice(
                    0,
                    config.maxItems
                );

                // Hidden (and collapsed by the host) when there is nothing to say.
                root.hidden = !school.settings.showAnnouncements || items.length === 0;
                setHeading(heading, config.title);

                const key = JSON.stringify([items, config.title]);
                if (key === lastKey) {
                    return;
                }
                lastKey = key;

                clear(container);
                for (const announcement of items) {
                    const article = createElement("article", "announcement");
                    article.append(
                        createElement("h4", "announcement-title", announcement.title),
                        createElement("p", "announcement-message", announcement.message)
                    );
                    container.appendChild(article);
                }
            }
        };
    }
};
