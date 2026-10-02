/** Quick links, one per line as "Label | https://example.com". */

import { createElement, clear } from "../../utils/dom.js";
import { makePanel, setHeading } from "./helpers.js";

/** Parse the textarea into [{ label, href }], keeping only http(s) links. */
export function parseLinks(text) {
    const links = [];
    for (const line of String(text || "").split("\n")) {
        const [label, ...rest] = line.split("|");
        const raw = rest.join("|").trim();
        if (!label.trim() || !raw) {
            continue;
        }
        try {
            const url = new URL(raw);
            if (url.protocol === "https:" || url.protocol === "http:") {
                links.push({ label: label.trim().slice(0, 60), href: url.href });
            }
        } catch {
            /* skip malformed URLs */
        }
    }
    return links.slice(0, 12);
}

export default {
    id: "links",
    name: "Quick links",
    description: "Links to the pages your students and staff use most.",
    icon: "Globe",
    defaultSize: "third",
    schema: {
        title: { type: "string", label: "Title", default: "Quick links", maxLength: 60 },
        links: {
            type: "textarea",
            label: "Links (one per line: Label | https://…)",
            default: "",
            maxLength: 1500
        }
    },

    create() {
        const { root, heading } = makePanel("links-panel", "Quick links", "Globe");
        const list = createElement("ul", "links-list");
        root.appendChild(list);
        let lastKey = "";

        return {
            element: root,
            update(_ctx, config) {
                const key = `${config.title}\n${config.links}`;
                if (key === lastKey) {
                    return;
                }
                lastKey = key;
                setHeading(heading, config.title);
                clear(list);

                const links = parseLinks(config.links);
                if (!links.length) {
                    list.appendChild(
                        createElement("li", "links-empty", "No links yet. Open this widget's settings to add some.")
                    );
                    return;
                }
                for (const { label, href } of links) {
                    const item = createElement("li", "links-item");
                    const anchor = createElement("a", "links-anchor", label);
                    anchor.href = href;
                    anchor.target = "_blank";
                    anchor.rel = "noopener noreferrer";
                    item.appendChild(anchor);
                    list.appendChild(item);
                }
            }
        };
    }
};
