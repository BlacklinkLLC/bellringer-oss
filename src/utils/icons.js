/**
 * Blacklink icon library (https://cdn.blacklink.net/blacklink-icons.js).
 *
 * The library is an ES module that maps icon names ("Calendar", "Bell", …)
 * to SVG URLs. It is loaded lazily, and every caller works without it: an icon
 * is purely decorative, so if the CDN is blocked, offline, or disabled with
 * `settings.cdnIcons: false`, the dashboard just renders without the glyphs.
 *
 * The icons are two-tone brand art (amber + white), so they are drawn as
 * background images and keep their own colors. (A CSS mask would flatten each
 * one into a single silhouette.)
 */

export const ICON_MODULE_URL = "https://cdn.blacklink.net/blacklink-icons.js";

let enabled = true;
let loadPromise = null;
let library = null;
const waiting = new Set();

function paint(element) {
    const url = library && library.getIcon(element.dataset.icon);
    if (url) {
        element.style.setProperty("--bl-icon", `url("${url}")`);
        element.classList.add("is-loaded");
    }
}

export function configureIcons({ enabled: on = true } = {}) {
    enabled = on !== false;
}

/** Load the icon library once; resolves to null if it is unavailable. */
export function loadIcons() {
    if (!enabled) {
        return Promise.resolve(null);
    }
    if (!loadPromise) {
        loadPromise = import(ICON_MODULE_URL)
            .then((module) => {
                library = module;
                waiting.forEach(paint);
                waiting.clear();
                return module;
            })
            .catch(() => {
                waiting.clear();
                return null;
            });
    }
    return loadPromise;
}

/**
 * A decorative icon element. Safe to create before the library has loaded;
 * it fills in when the library arrives.
 */
export function createIcon(name, className = "") {
    const element = document.createElement("span");
    element.className = `bl-icon ${className}`.trim();
    element.dataset.icon = name;
    element.setAttribute("aria-hidden", "true");

    if (enabled) {
        if (library) {
            paint(element);
        } else {
            waiting.add(element);
            loadIcons();
        }
    }
    return element;
}
