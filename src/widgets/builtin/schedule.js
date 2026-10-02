/**
 * Today's schedule list. Every block of the resolved day (including
 * synthesized passing time), with the active block marked by state, an
 * explicit "Now" chip, and not by color alone.
 */

import { createElement, setText, clear } from "../../utils/dom.js";
import { formatTimeRange } from "../../utils/format.js";
import { kindLabel } from "../../schedule/presets.js";
import { makePanel, setHeading } from "./helpers.js";

function message(list, text) {
    list.appendChild(createElement("li", "schedule-message", text));
}

export default {
    id: "schedule",
    name: "Today's schedule",
    description: "Every period today, with the current one highlighted.",
    icon: "Calendar",
    defaultSize: "two-thirds",
    schema: {
        hidePassing: { type: "boolean", label: "Hide passing time", default: false },
        hidePast: { type: "boolean", label: "Hide periods that already ended", default: false }
    },

    create() {
        const { root, heading } = makePanel("schedule-panel", "Today's Schedule", "Calendar");
        const list = createElement("ul", "schedule-list");
        root.appendChild(list);

        return {
            element: root,
            update({ time, daily }, config) {
                clear(list);
                setHeading(heading, daily.noSchool ? "Today's Schedule" : daily.scheduleName || "Today's Schedule");

                if (daily.noSchool) {
                    message(list, daily.reason || "No school today.");
                    return;
                }
                if (!daily.blocks.length) {
                    message(list, "No scheduled periods.");
                    return;
                }

                const now = time.minutesOfDay;
                const activeIndex = daily.blocks.findIndex(
                    (block) => now >= block.start && now < block.end
                );

                daily.blocks.forEach((block, index) => {
                    const past = block.end <= now && index !== activeIndex;
                    if ((config.hidePassing && block.passing) || (config.hidePast && past)) {
                        return;
                    }

                    const row = createElement("li", "period-row");
                    if (index === activeIndex) {
                        row.classList.add("is-now");
                    } else if (past) {
                        row.classList.add("is-past");
                    }
                    if (block.passing) {
                        row.classList.add("is-passing");
                    }

                    const nowChip = createElement("span", "now-chip", "Now");
                    nowChip.setAttribute("aria-hidden", "true");

                    row.append(
                        createElement("span", "period-time", formatTimeRange(block.start, block.end)),
                        createElement("strong", "period-name", block.name),
                        createElement("span", "period-kind", kindLabel(block)),
                        nowChip
                    );
                    list.appendChild(row);
                });
            }
        };
    }
};
