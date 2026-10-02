/**
 * Applies per-device appearance preferences to the page: theme override,
 * accent color, density, heading font and motion.
 *
 * Everything goes through CSS custom properties and data attributes on <html>
 * (set via the CSSOM, which the strict Content-Security-Policy allows), so the
 * stylesheets stay the single source of truth for how things look.
 */

import { setTheme, resolvedTheme } from "../theme/theme.js";
import { resolveAccent, hexToRgba, contrastInk } from "./prefs.js";

const ACCENT_VARS = ["--amber", "--amber-dim", "--amber-glow", "--on-amber", "--bg-glow-1"];

function applyAccent(prefs) {
    const root = document.documentElement;
    const theme = resolvedTheme();
    const accent = resolveAccent(prefs, theme);

    if (!accent) {
        ACCENT_VARS.forEach((name) => root.style.removeProperty(name));
        return;
    }
    root.style.setProperty("--amber", accent);
    root.style.setProperty("--amber-dim", hexToRgba(accent, theme === "light" ? 0.12 : 0.14));
    root.style.setProperty("--amber-glow", hexToRgba(accent, 0.55));
    root.style.setProperty("--on-amber", contrastInk(accent));
    root.style.setProperty("--bg-glow-1", hexToRgba(accent, theme === "light" ? 0.16 : 0.1));
}

let activePrefs = null;
let listening = false;

export function applyPrefs(prefs, configTheme) {
    activePrefs = prefs;
    const root = document.documentElement;

    setTheme(prefs.theme === "default" ? configTheme : prefs.theme);
    applyAccent(prefs);

    root.dataset.density = prefs.density;
    root.dataset.headingFont = prefs.headingFont;
    root.classList.toggle("reduce-motion", prefs.reduceMotion);

    // The accent has per-theme variants; recompute when the theme flips.
    if (!listening) {
        listening = true;
        window.addEventListener("bellringer:themechange", () => {
            if (activePrefs) {
                applyAccent(activePrefs);
            }
        });
    }
}
