const CACHE_NAME = 'vfr-navlog-cache-v1';
const API_CACHE = 'airport-api-cache';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './icon-192.png',
  './icon-512.png'
];

// Install app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Handle fetches
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 🛩️ Network-first, fallback-to-cache for airportdb.io
  if (url.hostname === 'airportdb.io' && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((liveResponse) => {
          // Save to cache if OK
          if (liveResponse.status === 200) {
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, liveResponse.clone());
            });
          }
          return liveResponse;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.open(API_CACHE).then((cache) => {
            return cache.match(request).then((cachedResponse) => {
              return cachedResponse || new Response(JSON.stringify({ error: "Offline and not cached" }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
          });
        })
    );
    return;
  }

  // 🌐 For everything else: static files = cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});
