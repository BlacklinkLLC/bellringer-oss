/**
 * Tiny localStorage wrapper. Storage can be unavailable or full (private
 * windows, kiosk browsers with storage disabled), so every call is guarded and
 * the dashboard simply falls back to the defaults.
 */

const LAYOUT_KEY = "bellringer.layout.v1";
const PREFS_KEY = "bellringer.prefs.v1";

function read(key) {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function write(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function remove(key) {
    try {
        window.localStorage.removeItem(key);
    } catch {
        /* nothing to do */
    }
}

export const loadSavedLayout = () => read(LAYOUT_KEY);
export const saveLayout = (layout) => write(LAYOUT_KEY, layout);
export const clearSavedLayout = () => remove(LAYOUT_KEY);
export const loadSavedPrefs = () => read(PREFS_KEY);
export const savePrefs = (prefs) => write(PREFS_KEY, prefs);
export const clearSavedPrefs = () => remove(PREFS_KEY);
