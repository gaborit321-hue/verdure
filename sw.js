// ============================================================
//  VERDURE — Service Worker
//  Pour forcer la mise à jour : incrémente APP_VERSION
// ============================================================

var APP_VERSION = "v1.1.0";
var CACHE_NAME  = "verdure-" + APP_VERSION;

var ASSETS = [
  "./index.html",
  "./manifest.json",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

// Installation : mise en cache des assets statiques
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting(); // Active immédiatement sans attendre
    })
  );
});

// Activation : supprime les anciens caches
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // Prend le contrôle immédiatement
    })
  );
});

// Fetch : network-first pour index.html, cache-first pour le reste
self.addEventListener("fetch", function(e) {
  var url = new URL(e.request.url);

  // Requêtes externes (GAS, API, fonts) → toujours network, jamais cache
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(e.request));
    return;
  }

  // index.html → network-first (pour détecter les mises à jour)
  if (url.pathname.endsWith("index.html") || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(e.request)
        .then(function(resp) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
          return resp;
        })
        .catch(function() { return caches.match(e.request); })
    );
    return;
  }

  // Assets statiques → cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        return resp;
      });
    })
  );
});
