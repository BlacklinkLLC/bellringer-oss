/**
 * Today's schedule list.
 *
 * Renders every block of the resolved day (including synthesized passing
 * time) with the active block highlighted via state, an explicit "Now" chip,
 * and not color alone.
 */

import { qs, setText, clear, createElement, toggleHidden } from "../utils/dom.js";
import { formatTimeRange } from "../utils/format.js";
import { kindLabel } from "../schedule/presets.js";

export function renderSchedule({ time, daily }) {
    const panel = qs("#schedule-panel");
    const heading = qs("#schedule-title");
    const list = qs("#schedule");

    if (daily.noSchool) {
        toggleHidden(panel, false);
        setText(heading, "Today's Schedule");
        clear(list);
        const item = createElement("li", "schedule-message");
        setText(item, daily.reason || "No school today.");
        list.appendChild(item);
        return;
    }

    toggleHidden(panel, false);
    setText(heading, daily.scheduleName || "Today's Schedule");
    clear(list);

    const now = time.minutesOfDay;
    const { blocks } = daily;

    if (!blocks.length) {
        const item = createElement("li", "schedule-message");
        setText(item, "No scheduled periods.");
        list.appendChild(item);
        return;
    }

    const activeIndex = blocks.findIndex(
        (block) => now >= block.start && now < block.end
    );

    for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        const row = createElement("li", "period-row");

        if (index === activeIndex) {
            row.classList.add("is-now");
        } else if (block.end <= now) {
            row.classList.add("is-past");
        }

        if (block.passing) {
            row.classList.add("is-passing");
        }

        const timeCell = createElement("span", "period-time");
        setText(timeCell, formatTimeRange(block.start, block.end));

        const nameCell = createElement("strong", "period-name");
        setText(nameCell, block.name);

        const kindCell = createElement("span", "period-kind");
        setText(kindCell, kindLabel(block));

        const nowChip = createElement("span", "now-chip", "Now");
        nowChip.setAttribute("aria-hidden", "true");

        row.appendChild(timeCell);
        row.appendChild(nameCell);
        row.appendChild(kindCell);
        row.appendChild(nowChip);

        list.appendChild(row);
    }
}