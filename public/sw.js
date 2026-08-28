/* eslint-disable no-restricted-globals */
// Offline cache for the crossword app.
//
// PRECACHE is rewritten at build time by scripts/postbuild.mjs with the real
// hashed asset names, so the very first visit is enough to make every route --
// including puzzles the player has not opened yet -- work with no network.
const VERSION = "__BUILD_ID__";
const CACHE = `crossword-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // addAll fails the whole install if a single asset 404s, so add
      // individually and tolerate misses.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Navigations ignore the query string: /play?id=x is served by /play. */
function navigationKey(url) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  return path;
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(navigationKey(new URL(request.url)), fresh.clone());
    return fresh;
  } catch {
    const url = new URL(request.url);
    return (
      (await cache.match(navigationKey(url))) ??
      (await cache.match(`${navigationKey(url)}.html`)) ??
      (await cache.match("/")) ??
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Build output is content-hashed, so it is safe to serve from cache forever.
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else -- the changelog included -- is network-first so it stays
  // current, with the cached copy as the offline fallback.
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(request);
        return cached ?? Response.error();
      }
    })(),
  );
});
