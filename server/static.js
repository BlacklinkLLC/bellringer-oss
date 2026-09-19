/**
 * Static file serving.
 *
 * Only files inside two roots are ever served:
 *   - the public/ directory (the app shell, manifest, service worker, icons)
 *   - the shared src/ tree (JavaScript modules and styles), reachable at /src/
 *
 * Requests outside the whitelist (config.json, server.js, source maps,
 * dotfiles, …) get a 404 rather than exposing filesystem layout.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SRC_DIR = path.join(ROOT, "src");

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8"
};

const ROOT_ALIASES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/sw.js": "sw.js",
    "/manifest.json": "manifest.json",
    "/favicon.svg": "icons/favicon.svg"
};

// URL prefix -> filesystem root. Match order matters (longest prefix first).
const MOUNTS = [
    { prefix: "/src/", dir: SRC_DIR },
    { prefix: "/", dir: PUBLIC_DIR }
];

const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "font-src 'self'",
        "base-uri 'self'",
        "form-action 'none'",
        "frame-ancestors 'self'"
    ].join("; ")
};

/**
 * Resolve a URL pathname to a filesystem path, or null if not allowed.
 */
function resolveFile(pathname) {
    // Root aliases first ("/", "/sw.js", …).
    const alias = ROOT_ALIASES[pathname];
    if (alias) {
        return path.join(PUBLIC_DIR, alias);
    }

    for (const mount of MOUNTS) {
        if (pathname.startsWith(mount.prefix) && pathname.length > mount.prefix.length) {
            const relative = pathname.slice(mount.prefix.length);
            if (relative.startsWith(".") || relative.includes("/.")) {
                return null;
            }
            return path.normalize(path.join(mount.dir, relative));
        }
    }

    return null;
}

export function createStaticHandler() {
    return function serveStatic(req, res, url) {
        if (req.method !== "GET" && req.method !== "HEAD") {
            res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Method Not Allowed");
            return;
        }

        const filePath = resolveFile(url.pathname);

        if (!filePath) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        if (!MIME_TYPES[extension]) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
            return;
        }

        fs.stat(filePath, (statError, stats) => {
            if (statError || !stats.isFile()) {
                res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                res.end("404 Not Found");
                return;
            }

            const headers = {
                ...SECURITY_HEADERS,
                "Content-Type":
                    MIME_TYPES[extension] || "application/octet-stream",
                "Cache-Control": "no-cache"
            };

            if (req.method === "HEAD") {
                res.writeHead(200, headers);
                res.end();
                return;
            }

            res.writeHead(200, headers);

            const stream = fs.createReadStream(filePath);
            stream.on("error", () => {
                res.destroy();
            });
            stream.pipe(res);
        });
    };
}