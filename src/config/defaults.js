/**
 * Default configuration and normalization helpers.
 *
 * Shared by the browser loader and the Node server so a schedule behaves
 * identically on both ends.
 */

export const DEFAULT_SETTINGS = {
    timezone: null,
    theme: "system",
    defaultSchedule: "regular",
    showClock: true,
    showDate: true,
    showStatus: true,
    showAnnouncements: true,
    showProgress: true,
    showNextPeriod: true
};

export const DEFAULT_CONFIG = {
    school: {
        name: "School",
        district: ""
    },
    settings: {},
    schedules: {},
    calendar: {},
    announcements: []
};

/**
 * Backwards compatibility: an older config used a top-level
 * `schedule` array. Promote it to a "regular" preset.
 */
export function migrateLegacyConfig(raw) {
    if (!raw || typeof raw !== "object") {
        return raw;
    }
    if (Array.isArray(raw.schedule) && !raw.schedules) {
        raw.schedules = {
            regular: {
                name: "Regular Schedule",
                periods: raw.schedule
            }
        };
        delete raw.schedule;
    }
    return raw;
}

/**
 * Fill in default settings and top-level keys without mutating the input.
 */
export function normalizeConfig(raw) {
    const migrated = migrateLegacyConfig(raw || {});

    const school = {
        ...DEFAULT_CONFIG.school,
        ...(migrated.school || {})
    };

    const settings = {
        ...DEFAULT_SETTINGS, // fills timezone: null etc.
        ...(migrated.settings || {})
    };

    return {
        school,
        settings,
        schedules: migrated.schedules || {},
        calendar: migrated.calendar || {},
        announcements: Array.isArray(migrated.announcements)
            ? migrated.announcements
            : []
    };
}