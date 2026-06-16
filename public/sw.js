/* DokMaker service worker.
 *
 * POLICY (AGENTS.md §2 — Mobile-first PWA): this SW is shell-only. It MUST NOT
 * cache any private data — invoice content, wallet, payments, downloads, or
 * final PDFs. We only precache the public app shell + static assets, and for
 * everything else we go network-first (falling back to cache only for the
 * already-precached shell). All /app/*, /api/*, and /admin/* requests bypass
 * the SW entirely (always hit the network).
 */
const CACHE = "dokmaker-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {
        /* tolerate missing assets during install */
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache private/authenticated/dynamic data.
  const isPrivate =
    url.pathname.startsWith("/app/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register");

  if (isPrivate) {
    return; // let the browser hit the network directly
  }

  // Network-first for public assets; fall back to cache when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful, basic (same-origin) GET responses.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
