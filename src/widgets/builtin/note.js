/** A free-text note, saved on this device. */

import { createElement, setText } from "../../utils/dom.js";
import { makePanel, setHeading } from "./helpers.js";

export default {
    id: "note",
    name: "Note",
    description: "A message or reminder you type yourself.",
    icon: "Stickies",
    defaultSize: "third",
    schema: {
        title: { type: "string", label: "Title", default: "Note", maxLength: 60 },
        text: { type: "textarea", label: "Text", default: "", maxLength: 1000 }
    },

    create() {
        const { root, heading } = makePanel("note-panel", "Note", "Stickies");
        const body = createElement("p", "note-body");
        root.appendChild(body);

        return {
            element: root,
            update(_ctx, config) {
                setHeading(heading, config.title);
                const empty = !config.text.trim();
                body.classList.toggle("is-placeholder", empty);
                setText(body, empty ? "Empty note. Open this widget's settings to add text." : config.text);
            }
        };
    }
};
