/**
 * Widget config schemas.
 *
 * A widget declares its settings as a small schema object:
 *
 *   { showProgress: { type: "boolean", label: "Show progress bar", default: true } }
 *
 * The same schema drives validation (here) and the settings form in the
 * customize panel, so a widget author only describes a setting once.
 * Pure and dependency-free; safe to run in Node for tests.
 */

export const FIELD_TYPES = ["boolean", "string", "textarea", "number", "select", "color", "date"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function optionValue(option) {
    return typeof option === "object" && option !== null ? option.value : option;
}

export function defaultForField(field) {
    if (field.default !== undefined) {
        return field.default;
    }
    switch (field.type) {
        case "boolean":
            return false;
        case "number":
            return Number.isFinite(field.min) ? field.min : 0;
        case "select":
            return optionValue(field.options[0]);
        case "color":
            return "#ffb020";
        default:
            return "";
    }
}

export function coerceValue(field, value) {
    switch (field.type) {
        case "boolean":
            return value === true || value === "true";
        case "number": {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return defaultForField(field);
            }
            const min = Number.isFinite(field.min) ? field.min : -Infinity;
            const max = Number.isFinite(field.max) ? field.max : Infinity;
            return Math.min(max, Math.max(min, number));
        }
        case "select": {
            const allowed = (field.options || []).map(optionValue);
            return allowed.includes(value) ? value : defaultForField(field);
        }
        case "color":
            return COLOR_RE.test(String(value)) ? String(value) : defaultForField(field);
        case "date":
            return DATE_RE.test(String(value)) ? String(value) : "";
        default: {
            const text = typeof value === "string" ? value : defaultForField(field);
            return text.slice(0, field.maxLength || 2000);
        }
    }
}

/**
 * Fill in defaults and coerce every known field; unknown keys are dropped.
 */
export function normalizeConfig(schema, raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const out = {};
    for (const [key, field] of Object.entries(schema || {})) {
        out[key] = key in input ? coerceValue(field, input[key]) : defaultForField(field);
    }
    return out;
}

/**
 * Throws if a widget author wrote a malformed schema, so mistakes show up at
 * registration time instead of as a broken settings form.
 */
export function assertValidSchema(id, schema) {
    for (const [key, field] of Object.entries(schema || {})) {
        if (!field || !FIELD_TYPES.includes(field.type)) {
            throw new Error(`Widget "${id}": field "${key}" has an unsupported type.`);
        }
        if (field.type === "select" && !(field.options && field.options.length)) {
            throw new Error(`Widget "${id}": select field "${key}" needs options.`);
        }
    }
}
