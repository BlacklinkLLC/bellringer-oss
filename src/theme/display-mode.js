/**
 * Display mode for TVs / wall displays.
 *
 * URL: /?mode=display
 *
 * Display mode adds a `display-mode` class to <html>; the stylesheet handles
 * enlarged typography and hidden chrome. The application works without any
 * mouse interaction in this mode.
 */

export function isDisplayMode() {
    const mode = new URLSearchParams(window.location.search).get("mode");
    return mode === "display";
}

export function applyDisplayMode() {
    if (isDisplayMode()) {
        document.documentElement.classList.add("display-mode");
    }
}