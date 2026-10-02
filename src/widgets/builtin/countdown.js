/** Days until a date the school cares about: break, testing, graduation… */

import { createElement, setText } from "../../utils/dom.js";
import { daysBetween, makePanel, setHeading } from "./helpers.js";

export default {
    id: "countdown",
    name: "Countdown",
    description: "Days remaining until a date you choose.",
    icon: "Speedometer",
    defaultSize: "third",
    display: true,
    schema: {
        label: { type: "string", label: "Label", default: "Winter Break", maxLength: 60 },
        date: { type: "date", label: "Date", default: "" }
    },

    create() {
        const { root, heading } = makePanel("countdown-widget", "", "Speedometer");
        root.classList.add("is-centered");
        const number = createElement("p", "countdown-number");
        const unit = createElement("p", "countdown-unit");
        root.append(number, unit);

        return {
            element: root,
            update({ time }, config) {
                setHeading(heading, config.label);

                if (!config.date) {
                    setText(number, "—");
                    setText(unit, "Choose a date in this widget's settings");
                    return;
                }

                const days = daysBetween(time.dateKey, config.date);
                if (days < 0) {
                    setText(number, "—");
                    setText(unit, "This date has passed");
                } else if (days === 0) {
                    setText(number, "Today");
                    setText(unit, "");
                } else {
                    setText(number, String(days));
                    setText(unit, days === 1 ? "day to go" : "days to go");
                }
            }
        };
    }
};
