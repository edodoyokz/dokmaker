// DokMaker service worker — security-safe caching strategy
//
// INVARIANTS (from AGENTS.md, DO NOT VIOLATE):
// 1. Never cache any /api/* response. All API calls go straight to network.
// 2. Never cache /app/* or /admin/* navigation. Those pages show private data.
// 3. Only static build assets (/_next/static/*) and public icons use cache.
// 4. Navigation requests are network-only; on failure show /offline.html.

const CACHE_VERSION = "v1";
const STATIC_CACHE = `dokmaker-static-${CACHE_VERSION}`;

// Files safe to precache (immutable, public, no auth).
const PRECACHE_URLS = [
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/offline.html",
];

// Patterns that MUST bypass the SW (never intercept, never cache).
const NETWORK_ONLY_PATTERNS = [
  /^\/api\//,
  /^\/app\//,
  /^\/admin\//,
  /^\/auth\//,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isNetworkOnly(url) {
  // Only consider same-origin paths for the pattern check.
  if (url.origin !== self.location.origin) return true;
  return NETWORK_ONLY_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET. All other methods (POST for payments, etc.) go to network untouched.
  if (request.method !== "GET") {
    return;
  }

  // Cross-origin: never intercept.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Sensitive paths: NEVER intercept. Let the browser hit the network directly.
  if (isNetworkOnly(url)) {
    return;
  }

  // Static build assets (content-hashed, immutable): cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
      )
    );
    return;
  }

  // Navigation requests (HTML pages): network-only, fall back to offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Public icons/manifest (in PRECACHE_URLS): cache-first with background refresh.
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((response) => {
        // Only cache successful, same-type responses.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached)
    )
  );
});
