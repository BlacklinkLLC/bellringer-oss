/**
 * Server-side configuration loading.
 *
 * Reads, parses and validates config.json on every request so configuration
 * changes are picked up on refresh (no restart needed). Validation failures
 * are returned as messages instead of crashing the server.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig } from "../src/config/validate.js";

const CONFIG_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "config.json"
);

/**
 * Returns { ok, config?, errors? }. Never throws for config problems.
 */
export async function loadConfigFile() {
    let raw;

    try {
        const text = await fs.readFile(CONFIG_PATH, "utf8");
        raw = JSON.parse(text);
    } catch (error) {
        if (error.code === "ENOENT") {
            return {
                ok: false,
                errors: [`config.json was not found next to server.js (expected here: ${CONFIG_PATH}).`]
            };
        }
        if (error instanceof SyntaxError) {
            return {
                ok: false,
                errors: [`config.json is not valid JSON: ${error.message}`]
            };
        }
        return {
            ok: false,
            errors: [`Could not read config.json: ${error.message}`]
        };
    }

    const result = validateConfig(raw);
    return {
        ok: result.valid,
        errors: result.errors,
        config: result.config
    };
}