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
/**
 * Display mode hides all chrome (and the cursor), so give people a way out:
 * Esc returns to the normal dashboard.
 */
export function enableDisplayModeExit() {
    if (!isDisplayMode()) {
        return;
    }
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            const url = new URL(window.location.href);
            url.searchParams.delete("mode");
            window.location.assign(url.pathname + url.search);
        }
    });
}
