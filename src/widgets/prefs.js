/**
 * Per-device appearance preferences.
 *
 * These are saved in the browser (not config.json), so each screen can look
 * different: the principal's laptop can use a light theme and a green accent
 * while the hallway TV keeps the school's defaults.
 */

export const ACCENTS = {
    amber: { label: "Amber", dark: "#ffb020", light: "#a86f00" },
    sky: { label: "Sky", dark: "#5cb8ff", light: "#0b6bb8" },
    mint: { label: "Mint", dark: "#4fd6a0", light: "#0c7a52" },
    rose: { label: "Rose", dark: "#ff7a9c", light: "#b8264f" },
    violet: { label: "Violet", dark: "#b49cff", light: "#5b3fc4" }
};

export const DEFAULT_PREFS = {
    theme: "default", // default = whatever config.json says
    accent: "default",
    customAccent: "#ffb020",
    density: "comfortable", // comfortable | compact
    headingFont: "serif", // serif | sans
    reduceMotion: false
};

const CHOICES = {
    theme: ["default", "system", "light", "dark"],
    accent: ["default", ...Object.keys(ACCENTS), "custom"],
    density: ["comfortable", "compact"],
    headingFont: ["serif", "sans"]
};

export function normalizePrefs(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const prefs = { ...DEFAULT_PREFS };

    for (const [key, allowed] of Object.entries(CHOICES)) {
        if (allowed.includes(input[key])) {
            prefs[key] = input[key];
        }
    }
    if (/^#[0-9a-fA-F]{6}$/.test(input.customAccent)) {
        prefs.customAccent = input.customAccent;
    }
    prefs.reduceMotion = input.reduceMotion === true;
    return prefs;
}

/** "#rrggbb" + alpha -> "rgba(r, g, b, a)" */
export function hexToRgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * The accent color to use for a resolved theme ("light" | "dark"), or null
 * to keep the stylesheet's default.
 */
export function resolveAccent(prefs, resolvedTheme) {
    if (prefs.accent === "default") {
        return null;
    }
    if (prefs.accent === "custom") {
        return prefs.customAccent;
    }
    const preset = ACCENTS[prefs.accent];
    return preset ? preset[resolvedTheme === "light" ? "light" : "dark"] : null;
}

/** Pick the readable text color (dark or light) to put on top of a color. */
export function contrastInk(hex) {
    const value = parseInt(hex.slice(1), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#201e19" : "#ffffff";
}
