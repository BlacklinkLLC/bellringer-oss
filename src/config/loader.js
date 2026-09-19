/**
 * Config loader used by the browser.
 *
 * Fetches the validated config from /api/config, falling back to a plain
 * config.json fetch (for users who host `public/` on a plain static server).
 * Either way the result is normalized and validated client-side so a bad or
 * legacy config produces a readable error screen instead of a blank page.
 */

import { validateConfig } from "./validate.js";

export class ConfigError extends Error {
    constructor(messages, status) {
        super(messages[0] || "Invalid configuration.");
        this.name = "ConfigError";
        this.messages = messages;
        this.status = status || 0;
    }
}

async function extractErrorMessages(response) {
    try {
        const body = await response.json();
        if (Array.isArray(body.errors) && body.errors.length > 0) {
            return body.errors;
        }
        if (body.error) {
            return [body.error];
        }
    } catch {
        // fall through to the generic message below
    }
    return [`Failed to load configuration (HTTP ${response.status}).`];
}

async function loadFrom(that) {
    const response = await that();

    if (!response.ok) {
        throw new ConfigError(
            await extractErrorMessages(response),
            response.status
        );
    }

    const raw = await response.json();
    // The API wraps the config in { ok: true, config }; a static config.json
    // is the config itself. Handle both.
    const candidate =
        raw && typeof raw === "object" && "config" in raw
            ? raw.config
            : raw;

    const result = validateConfig(candidate);
    if (!result.valid) {
        throw new ConfigError(result.errors);
    }
    return result.config;
}

/**
 * Network failures and missing API (HTTP 404) trigger a static config.json
 * fallback so the app still works when hosted without the Node server.
 * Invalid configs are never swallowed.
 */
export async function loadConfig() {
    let apiError = null;

    try {
        return await loadFrom(() =>
            fetch("/api/config", { headers: { Accept: "application/json" } })
        );
    } catch (error) {
        apiError = error;
    }

    const useFallback =
        apiError instanceof TypeError || apiError.status === 404;

    if (useFallback) {
        try {
            return await loadFrom(() => fetch("config.json"));
        } catch {
            throw apiError;
        }
    }

    throw apiError;
}