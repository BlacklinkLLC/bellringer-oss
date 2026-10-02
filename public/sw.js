/* BellRinger Open service worker
 *
 * Goal: the dashboard keeps working when the network temporarily disappears.
 * Strategy: cache the app shell at install time, then cache-first with a
 * background refresh for same-origin GET requests. API calls (including
 * /api/config) are network-first so fresh data wins, with the last known
 * response as an offline fallback.
 */

const VERSION = "bellringer-open-v3";

// Blacklink CDN hosts whose assets (icon library, NOVA component CSS) are
// cached at runtime so they keep working offline.
const CDN_HOSTS = ["https://cdn.blacklink.net", "https://nova.blacklink.net"];

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
  "/src/utils/icons.js",
  "/src/theme/theme.js",
  "/src/theme/display-mode.js",
  "/src/components/clock.js",
  "/src/components/school-status.js",
  "/src/components/error-screen.js",
  "/src/widgets/registry.js",
  "/src/widgets/schema.js",
  "/src/widgets/layout.js",
  "/src/widgets/prefs.js",
  "/src/widgets/storage.js",
  "/src/widgets/appearance.js",
  "/src/widgets/host.js",
  "/src/widgets/controller.js",
  "/src/widgets/builtin/index.js",
  "/src/widgets/builtin/helpers.js",
  "/src/widgets/builtin/current-period.js",
  "/src/widgets/builtin/schedule.js",
  "/src/widgets/builtin/announcements.js",
  "/src/widgets/builtin/clock.js",
  "/src/widgets/builtin/countdown.js",
  "/src/widgets/builtin/upcoming.js",
  "/src/widgets/builtin/note.js",
  "/src/widgets/builtin/links.js",
  "/src/styles/main.css",
  "/src/styles/themes.css",
  "/src/styles/nova-bridge.css",
  "/src/styles/layout.css",
  "/src/styles/components/clock.css",
  "/src/styles/components/status.css",
  "/src/styles/components/hero.css",
  "/src/styles/components/schedule.css",
  "/src/styles/components/announcements.css",
  "/src/styles/components/icons.css",
  "/src/styles/components/widgets.css",
  "/src/styles/components/customize.css",
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

  const sameOrigin = request.url.startsWith(self.location.origin);
  const fromCdn = CDN_HOSTS.some((host) => request.url.startsWith(host));

  if (request.method !== "GET" || (!sameOrigin && !fromCdn)) {
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