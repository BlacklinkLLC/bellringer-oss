/**
 * BellRinger Open — application entry point.
 *
 * This module only orchestrates: load configuration, apply theme/display mode,
 * then tick the render loop. All domain logic and rendering live in the
 * schedule, config, component, and utility modules.
 */

import { loadConfig, ConfigError } from "./config/loader.js";
import { buildDailySchedule, computeState } from "./schedule/schedule-engine.js";
import { nowInTimeZone } from "./utils/time.js";
import { showErrorScreen } from "./components/error-screen.js";
import { initTheme } from "./theme/theme.js";
import { applyDisplayMode } from "./theme/display-mode.js";

import { renderClockComponent } from "./components/clock.js";
import { renderSchoolStatus } from "./components/school-status.js";
import { renderCurrentPeriod } from "./components/current-period.js";
import { renderProgress } from "./components/progress.js";
import { renderNextPeriod } from "./components/next-period.js";
import { renderSchedule } from "./components/schedule.js";
import { renderAnnouncements } from "./components/announcements.js";

let config = null;
let lastDateKey = null;
let lastDaily = null;

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
        lastDateKey = time.dateKey;
    }

    const snapshot = computeState(lastDaily.blocks, time.minutesOfDay);
    const ctx = { config, time, daily: lastDaily, snapshot };

    renderClockComponent(ctx);
    renderSchoolStatus(ctx);
    renderCurrentPeriod(ctx);
    renderProgress(ctx);
    renderNextPeriod(ctx);
    renderSchedule(ctx);
    renderAnnouncements(ctx);
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

    initTheme(config.settings.theme);
    applyDisplayMode();
    registerServiceWorker();

    renderHeader();
    render();

    setInterval(render, 1000);
}

start();