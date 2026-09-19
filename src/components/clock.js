/**
 * Clock + date component (header).
 *
 * Renders the wall-clock time and date in the configured timezone so a TV or
 * display device in another timezone still shows school time correctly.
 */

import { qs, setText, toggleHidden } from "../utils/dom.js";
import { formatDateLabel } from "../utils/format.js";

const PAD = (n) => String(n).padStart(2, "0");

export function renderClockComponent({ config, time }) {
    const clockNode = qs("#clock");
    const dateNode = qs("#date");

    const hidden = !config.settings.showClock;
    toggleHidden(clockNode, hidden);
    toggleHidden(dateNode, hidden || !config.settings.showDate);

    const meridiem = time.hour < 12 ? "AM" : "PM";
    const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;

    setText(
        clockNode,
        `${hour12}:${PAD(time.minute)}:${PAD(time.second)} ${meridiem}`
    );
    setText(dateNode, formatDateLabel(time.dateKey));
}