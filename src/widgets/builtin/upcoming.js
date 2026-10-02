/** The next few entries from the calendar: no-school days and schedule changes. */

import { createElement, clear } from "../../utils/dom.js";
import { formatRelativeDay } from "../../utils/format.js";
import { daysBetween, makePanel, setHeading } from "./helpers.js";

function describe(entry) {
    if (entry.name) {
        return entry.name;
    }
    return entry.type === "no-school" ? "No School" : "Schedule change";
}

export default {
    id: "upcoming",
    name: "Coming up",
    description: "Upcoming no-school days and schedule changes from the calendar.",
    icon: "Pin",
    defaultSize: "third",
    schema: {
        title: { type: "string", label: "Title", default: "Coming up", maxLength: 60 },
        count: { type: "number", label: "How many to show", default: 5, min: 1, max: 10 }
    },

    create() {
        const { root, heading } = makePanel("upcoming-panel", "Coming up", "Pin");
        const list = createElement("ul", "upcoming-list");
        root.appendChild(list);
        let lastKey = "";

        return {
            element: root,
            update({ config: school, time }, config) {
                const key = `${time.dateKey}|${config.count}|${config.title}`;
                if (key === lastKey) {
                    return;
                }
                lastKey = key;
                setHeading(heading, config.title);
                clear(list);

                const entries = Object.entries(school.calendar || {})
                    .filter(([dateKey]) => dateKey >= time.dateKey)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(0, config.count);

                if (!entries.length) {
                    list.appendChild(createElement("li", "upcoming-empty", "Nothing on the calendar."));
                    return;
                }

                for (const [dateKey, entry] of entries) {
                    const ahead = daysBetween(time.dateKey, dateKey);
                    const when = ahead === 0 ? "Today" : formatRelativeDay(ahead, dateKey);
                    const item = createElement("li", "upcoming-item");
                    if (entry.type === "no-school") {
                        item.classList.add("is-no-school");
                    }
                    item.append(
                        createElement("span", "upcoming-when", when),
                        createElement("strong", "upcoming-name", describe(entry)),
                        createElement(
                            "span",
                            "upcoming-kind",
                            entry.type === "no-school" ? "No school" : "Schedule"
                        )
                    );
                    list.appendChild(item);
                }
            }
        };
    }
};
