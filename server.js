/**
 * BellRinger Open — HTTP server.
 *
 * Small, dependency-free entry point. Routing is split across the API and
 * static modules in server/ so this file stays focused on wiring.
 */

import http from "node:http";
import { createStaticHandler } from "./server/static.js";
import { createApiHandler } from "./server/api.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const serveStatic = createStaticHandler();
const handleApi = createApiHandler();

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/healthz" || url.pathname.startsWith("/api/")) {
        try {
            await handleApi(req, res, url);
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "Internal server error." }));
            console.error("API error:", error);
        }
        return;
    }

    serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
    console.log("BellRinger Open running at http://localhost:" + PORT);
});