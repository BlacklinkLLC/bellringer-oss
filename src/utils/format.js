/**
 * Formatting helpers for times, durations and dates.
 * Pure functions; safe to use in the browser and in Node.
 */

const pad2 = (value) => String(value).padStart(2, "0");

/**
 * 505 -> "8:25 AM".
 */
export function formatClockMinutes(minutes) {
    const total = Math.round(minutes);
    const date = new Date(2000, 0, 1, Math.floor(total / 60), total % 60);
    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

/**
 * 505 and 555 -> "8:25 AM – 9:15 AM".
 */
export function formatTimeRange(startMinutes, endMinutes) {
    return `${formatClockMinutes(startMinutes)} – ${formatClockMinutes(endMinutes)}`;
}

/**
 * 42.5 -> "42m"; 75 -> "1h 15m"; 59 -> "59m".
 */
export function formatDuration(minutes) {
    const total = Math.floor(minutes);
    const hours = Math.floor(total / 60);
    const mins = total % 60;

    if (hours === 0) {
        return `${mins}m`;
    }
    if (mins === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
}

/**
 * 222 seconds -> "3:42"; 3725 seconds -> "1h 02m".
 * Used for "Starts in ..." countdowns.
 */
export function formatCountdown(seconds) {
    const total = Math.max(0, Math.floor(seconds));

    if (total >= 3600) {
        const hours = Math.floor(total / 3600);
        const mins = Math.floor((total % 3600) / 60);
        return `${hours}h ${pad2(mins)}m`;
    }

    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${minutes}:${pad2(secs)}`;
}

/**
 * "2026-09-18" -> "Friday, September 18".
 */
export function formatDateLabel(dateKey) {
    // Noon avoids any local-timezone day boundary shifts.
    const date = new Date(`${dateKey}T12:00:00`);
    return date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric"
    });
}