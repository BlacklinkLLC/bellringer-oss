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

export function initTheme(themeSetting) {
    const theme = THEMES.includes(themeSetting) ? themeSetting : "system";
    applyTheme(theme);

    if (theme !== "system") {
        return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);

    // Allows the SPA shell to keep theme matching without a hard reload.
    window.__bellringerThemeCleanup = () =>
        media.removeEventListener("change", onChange);
}