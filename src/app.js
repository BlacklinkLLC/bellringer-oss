/**
 * BellRinger Open — application entry point.
 *
 * This module only orchestrates: load configuration, apply theme/display mode,
 * then tick the render loop. All domain logic and rendering live in the
 * schedule, config, component, and utility modules.
 */

import { loadConfig, ConfigError } from "./config/loader.js";
import {
    buildDailySchedule,
    computeState,
    findNextSchoolDay
} from "./schedule/schedule-engine.js";
import { nowInTimeZone } from "./utils/time.js";
import { showErrorScreen } from "./components/error-screen.js";
import { applyDisplayMode, enableDisplayModeExit } from "./theme/display-mode.js";

import { renderClockComponent } from "./components/clock.js";
import { renderSchoolStatus } from "./components/school-status.js";
import { configureIcons, loadIcons } from "./utils/icons.js";
import { registerBuiltinWidgets } from "./widgets/builtin/index.js";
import { createController } from "./widgets/controller.js";

let config = null;
let widgets = null;
let lastDateKey = null;
let lastDaily = null;
let lastUpcoming = null;

function renderHeader() {
    document.title = `BellRinger Open | ${config.school.name}`;
    document.getElementById("school-name").textContent = config.school.name;

    const district = config.school.district;
    const districtNode = document.getElementById("school-district");
    districtNode.hidden = !district;
    districtNode.textContent = district || "";
}

function render() {
    const time = nowInTimeZone(config.settings.timezone);

    if (time.dateKey !== lastDateKey) {
        lastDaily = buildDailySchedule(config, time.dateKey, time.weekday);
        lastUpcoming = findNextSchoolDay(config, time.dateKey);
        lastDateKey = time.dateKey;
    }

    const snapshot = computeState(lastDaily.blocks, time.minutesOfDay);
    const ctx = {
        config,
        time,
        daily: lastDaily,
        snapshot,
        upcoming: snapshot.nextBlock ? null : lastUpcoming
    };

    renderClockComponent(ctx);
    renderSchoolStatus(ctx);
    widgets.tick(ctx);
}

function registerServiceWorker() {
    if (!navigator.serviceWorker) {
        return;
    }
    navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Service worker registration failed:", error);
    });
}

async function start() {
    try {
        config = await loadConfig();
    } catch (error) {
        const messages =
            error instanceof ConfigError
                ? error.messages
                : [`${error.message || error}`];
        showErrorScreen({ messages });
        return;
    }

    applyDisplayMode();
    enableDisplayModeExit();
    registerServiceWorker();

    // Decorative icons from the Blacklink icon library; the app works without them.
    configureIcons({ enabled: config.settings.cdnIcons });
    loadIcons();

    registerBuiltinWidgets();
    widgets = createController({
        config,
        container: document.getElementById("widget-grid"),
        openButton: document.getElementById("customize-button")
    });
    widgets.start(); // also applies the theme + this device's saved appearance

    renderHeader();
    render();

    setInterval(render, 1000);
}

start();