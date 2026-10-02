/** A large clock + date, for when the header clock is too small. */

import { createElement, setText, toggleHidden } from "../../utils/dom.js";
import { formatDateLabel } from "../../utils/format.js";
import { makePanel } from "./helpers.js";

const pad = (n) => String(n).padStart(2, "0");

export default {
    id: "clock",
    name: "Clock",
    description: "A large clock and date in the school's timezone.",
    icon: "Clock",
    defaultSize: "third",
    display: false, // display mode already shows a large header clock
    schema: {
        showSeconds: { type: "boolean", label: "Show seconds", default: true },
        hour24: { type: "boolean", label: "24-hour time", default: false },
        showDate: { type: "boolean", label: "Show date", default: true }
    },

    create() {
        const { root } = makePanel("clock-widget", "");
        root.classList.add("is-centered");
        const clock = createElement("time", "clock-big");
        const date = createElement("p", "clock-date");
        root.append(clock, date);

        return {
            element: root,
            update({ time }, config) {
                const hours = config.hour24 ? pad(time.hour) : String(time.hour % 12 || 12);
                const suffix = config.hour24 ? "" : ` ${time.hour < 12 ? "AM" : "PM"}`;
                const seconds = config.showSeconds ? `:${pad(time.second)}` : "";
                setText(clock, `${hours}:${pad(time.minute)}${seconds}${suffix}`);
                toggleHidden(date, !config.showDate);
                setText(date, formatDateLabel(time.dateKey));
            }
        };
    }
};
