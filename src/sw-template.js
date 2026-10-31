// Service worker: lets the app open and work without signal after the first
// visit. vite.config.ts fills in VERSION and PRECACHE (every built file) at
// build time and writes the result to /sw.js.
//
// - App pages: network first (so a new deploy shows up), cached copy offline.
// - Built files (hashed names, never change): cache first.
// - Google Fonts: cached after first use.
// - /api and the weather service: never cached here; the app handles those.

const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const APP_CACHE = `m23-app-${VERSION}`;
const FONT_CACHE = "m23-fonts";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("m23-app-") && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/", { cacheName: APP_CACHE })),
    );
    return;
  }

  event.respondWith(cacheFirst(request, APP_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}
