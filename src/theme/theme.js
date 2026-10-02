/**
 * Theme handling: light / dark / system.
 *
 * Applies a `data-theme` attribute to <html>. The "system" setting resolves
 * against the OS preference and stays in sync when it changes.
 */

const THEMES = ["light", "dark"];

function resolveSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function applyTheme(theme) {
    const resolved = theme === "system" ? resolveSystemTheme() : theme;
    document.documentElement.dataset.theme = resolved;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        const color = resolved === "light" ? "#f6f3ec" : "#0a0a10";
        meta.setAttribute("content", color);
    }
}

let mediaQuery = null;
let mediaListener = null;
let currentSetting = null;

function stopWatchingSystem() {
    if (mediaQuery && mediaListener) {
        mediaQuery.removeEventListener("change", mediaListener);
    }
    mediaQuery = null;
    mediaListener = null;
}

export function resolvedTheme() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * Switch theme at runtime. "system" follows the OS preference and stays in
 * sync when it changes. Fires `bellringer:themechange` so anything derived
 * from the theme (the accent color) can recompute.
 */
export function setTheme(themeSetting) {
    const theme = THEMES.includes(themeSetting) ? themeSetting : "system";
    if (theme === currentSetting) {
        return;
    }
    currentSetting = theme;
    stopWatchingSystem();
    applyTheme(theme);

    if (theme === "system") {
        mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        mediaListener = () => {
            applyTheme("system");
            window.dispatchEvent(new Event("bellringer:themechange"));
        };
        mediaQuery.addEventListener("change", mediaListener);
    }
    window.dispatchEvent(new Event("bellringer:themechange"));
}

export function initTheme(themeSetting) {
    setTheme(themeSetting);

    // Allows the SPA shell to keep theme matching without a hard reload.
    window.__bellringerThemeCleanup = stopWatchingSystem;
}
