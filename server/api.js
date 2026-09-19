/**
 * Read-only API handlers.
 *
 *   GET /healthz          -> basic health check
 *   GET /api/config       -> validated configuration
 *   GET /api/schedule     -> resolved daily schedule (optional ?date=YYYY-MM-DD)
 *   GET /api/current      -> current state snapshot
 *   GET /api/next         -> next block snapshot
 *
 * All endpoints are read-only and return JSON. The schedule logic is shared
 * with the browser (src/schedule/schedule-engine.js) so both agree.
 */

import { loadConfigFile } from "./config.js";
import {
    buildDailySchedule,
    computeState
} from "../src/schedule/schedule-engine.js";
import { snapshotAt, weekdayForDateKey } from "../src/utils/time.js";

const ROUTES = ["/api/config", "/api/schedule", "/api/current", "/api/next"];

function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache"
    });
    res.end(payload);
}

function validDateKey(dateKey) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!match) {
        return false;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }
    const date = weekdayForDateKey(dateKey);
    return !Number.isNaN(date);
}

/**
 * Resolve a target instant/date. Supports an optional ?date=YYYY-MM-DD query
 * parameter to preview a specific calendar day.
 */
function resolveTarget(searchParams, timezone) {
    const dateParam = searchParams.get("date");
    const now = snapshotAt(Date.now(), timezone);

    if (!dateParam) {
        return { error: null, time: now };
    }
    if (!validDateKey(dateParam)) {
        return { error: `"${dateParam}" is not a valid date. Use YYYY-MM-DD.` };
    }

    return {
        error: null,
        time: {
            ...now,
            dateKey: dateParam,
            weekday: weekdayForDateKey(dateParam)
        }
    };
}

export function createApiHandler() {
    return async function handleApi(req, res, url) {
        const { pathname, searchParams } = url;

        if (pathname === "/healthz") {
            const health = await loadConfigFile();
            return sendJson(res, 200, {
                ok: true,
                app: "bellringer-open",
                configOk: health.ok,
                errors: health.errors || [],
                time: new Date().toISOString()
            });
        }

        if (!pathname.startsWith("/api/")) {
            return sendJson(res, 404, { ok: false, error: "Not found." });
        }

        if (!ROUTES.includes(pathname)) {
            return sendJson(res, 404, {
                ok: false,
                error: `Unknown API endpoint "${pathname}".`
            });
        }

        if (req.method !== "GET" && req.method !== "HEAD") {
            return sendJson(res, 405, {
                ok: false,
                error: "Only GET is supported."
            });
        }

        const configResult = await loadConfigFile();
        if (!configResult.ok) {
            return sendJson(res, 422, {
                ok: false,
                errors: configResult.errors
            });
        }

        const { config } = configResult;

        if (pathname === "/api/config") {
            return sendJson(res, 200, { ok: true, config });
        }

        const target = resolveTarget(searchParams, config.settings.timezone);
        if (target.error) {
            return sendJson(res, 400, { ok: false, error: target.error });
        }

        const { time } = target;
        const daily = buildDailySchedule(config, time.dateKey, time.weekday);
        const snapshot = computeState(daily.blocks, time.minutesOfDay);

        if (pathname === "/api/schedule") {
            return sendJson(res, 200, {
                ok: true,
                date: time.dateKey,
                scheduleKey: daily.scheduleKey,
                scheduleName: daily.scheduleName,
                noSchool: daily.noSchool,
                reason: daily.reason,
                blocks: daily.blocks
            });
        }

        if (pathname === "/api/current") {
            return sendJson(res, 200, {
                ok: true,
                at: time.iso,
                date: time.dateKey,
                state: snapshot.stateKey,
                label: snapshot.stateLabel,
                current: snapshot.currentBlock,
                progress: snapshot.progress,
                next: snapshot.nextBlock,
                nextStartInSeconds: snapshot.nextStartInSeconds
            });
        }

        if (pathname === "/api/next") {
            return sendJson(res, 200, {
                ok: true,
                at: time.iso,
                date: time.dateKey,
                next: snapshot.nextBlock,
                nextStartInSeconds: snapshot.nextStartInSeconds
            });
        }

        return sendJson(res, 404, { ok: false, error: "Not found." });
    };
}