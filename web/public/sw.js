/* Service worker: makes the app open with poor or no signal.
   - /assets/* are content-hashed by Vite, so they are served cache-first.
   - The page itself and /api/export are network-first; if the network fails,
     the last good copy is served (the API copy is tagged so the app can say so).
   Bump CACHE to throw away everything cached by an older version. */
const CACHE = "fl-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, cacheKey, tagWhenCached) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(cacheKey, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(cacheKey);
    if (!hit) throw err;
    if (!tagWhenCached) return hit;
    const headers = new Headers(hit.headers);
    headers.set("x-fl-cache", "1");
    return new Response(hit.body, { status: hit.status, headers });
  }
}

/* The page sends the files it loaded before this worker took control. */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "precache") return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(event.data.urls.map((u) => cache.add(u).catch(() => undefined)));
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname === "/api/export") {
    event.respondWith(networkFirst(request, "/api/export", true));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/", false));
  } else if (!url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, request, false));
  }
});
