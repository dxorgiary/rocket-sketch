/* ============================================================
   Rocket Sketch — Service Worker
   Caches the game shell so it works fully offline once installed.
   Bump CACHE_NAME on every release so old caches get cleared.
   ============================================================ */
var CACHE_NAME = "rocket-sketch-cache-v1";

var ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-192-maskable.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS_TO_CACHE).catch(function () {
        /* If an icon file is missing at build time, don't fail
           the whole install — cache what we can. */
        return Promise.all(
          ASSETS_TO_CACHE.map(function (url) {
            return cache.add(url).catch(function () {});
          })
        );
      });
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request)
        .then(function (response) {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(function () {
          // Offline and not cached — fall back to the game shell
          // for navigations so the app still opens.
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
