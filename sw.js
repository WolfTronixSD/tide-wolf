// Tide Wolf service worker: keeps the app usable at the beach with a weak signal.
// Page and tides.json: network first, saved copy as fallback. Versioned files (?v=) and icons: saved copy first.
// Open-Meteo and NOAA calls are not touched here; app.js keeps its own saved copy of them.
const CACHE = "tide-wolf-1.0.0";
const PRECACHE = ["./", "index.html", "style.css?v=1.0.0", "app.js?v=1.0.0", "data.js?v=1.0.0", "version.js?v=1.0.0", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const networkFirst = async (req, key = req) => {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch {
    return (await cache.match(key, { ignoreSearch: true })) || Response.error();
  }
};

const cacheFirst = async (req) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate") e.respondWith(networkFirst(req, "./"));
  else if (url.pathname.endsWith("/tides.json")) e.respondWith(networkFirst(req, new Request(url.origin + url.pathname)));
  else e.respondWith(cacheFirst(req));
});
