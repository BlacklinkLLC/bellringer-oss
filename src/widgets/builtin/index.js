/** Registers every built-in widget. Add your own here. */

import { registerWidget } from "../registry.js";
import currentPeriod from "./current-period.js";
import schedule from "./schedule.js";
import announcements from "./announcements.js";
import clock from "./clock.js";
import countdown from "./countdown.js";
import upcoming from "./upcoming.js";
import note from "./note.js";
import links from "./links.js";

let registered = false;

export function registerBuiltinWidgets() {
    if (registered) {
        return;
    }
    registered = true;
    [currentPeriod, schedule, announcements, clock, countdown, upcoming, note, links].forEach(
        registerWidget
    );
}
