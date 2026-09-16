const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const publicDirectory = __dirname;

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

const server = http.createServer((request, response) => {
    let requestPath = decodeURIComponent(
        request.url.split("?")[0]
    );

    if (requestPath === "/") {
        requestPath = "/index.html";
    }

    const filePath = path.join(
        publicDirectory,
        requestPath
    );

    // Prevent paths such as /../server.js
    if (!filePath.startsWith(publicDirectory)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }

    fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
            response.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8"
            });

            response.end("404 Not Found");
            return;
        }

        const extension =
            path.extname(filePath).toLowerCase();

        const contentType =
            mimeTypes[extension] ||
            "application/octet-stream";

        fs.readFile(filePath, (error, data) => {
            if (error) {
                response.writeHead(500, {
                    "Content-Type":
                        "text/plain; charset=utf-8"
                });

                response.end("500 Internal Server Error");
                return;
            }

            response.writeHead(200, {
                "Content-Type": contentType,
                "Cache-Control": "no-cache"
            });

            response.end(data);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(
        `BellRinger Open running at http://localhost:${PORT}`
    );
});