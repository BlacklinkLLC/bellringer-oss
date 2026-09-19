/* BellRinger Open service worker
 *
 * Goal: the dashboard keeps working when the network temporarily disappears.
 * Strategy: cache the app shell at install time, then cache-first with a
 * background refresh for same-origin GET requests. API calls (including
 * /api/config) are network-first so fresh data wins, with the last known
 * response as an offline fallback.
 */

const VERSION = "bellringer-open-v1";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/src/app.js",
  "/src/config/loader.js",
  "/src/config/defaults.js",
  "/src/config/validate.js",
  "/src/schedule/schedule-engine.js",
  "/src/schedule/calendar.js",
  "/src/schedule/presets.js",
  "/src/utils/time.js",
  "/src/utils/format.js",
  "/src/utils/dom.js",
  "/src/theme/theme.js",
  "/src/theme/display-mode.js",
  "/src/components/clock.js",
  "/src/components/school-status.js",
  "/src/components/current-period.js",
  "/src/components/progress.js",
  "/src/components/next-period.js",
  "/src/components/schedule.js",
  "/src/components/announcements.js",
  "/src/components/error-screen.js",
  "/src/styles/main.css",
  "/src/styles/themes.css",
  "/src/styles/layout.css",
  "/src/styles/components/clock.css",
  "/src/styles/components/status.css",
  "/src/styles/components/hero.css",
  "/src/styles/components/schedule.css",
  "/src/styles/components/announcements.css",
  "/src/styles/components/display-mode.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    // Network-first: keep the API fresh, fall back to the last cached reply.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          return Response.error();
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        // Serve instantly; refresh the cache in the background.
        event.waitUntil(network.then(() => {}));
        return cached;
      }

      return network.then((response) => {
        if (response) {
          return response;
        }
        if (request.mode === "navigate") {
          return caches.match("/index.html");
        }
        return Response.error();
      });
    })
  );
});