const CACHE_NAME = 'vfr-navlog-cache-v1';
const API_CACHE = 'airport-api-cache';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ✅ Special handling for airportdb.io
  if (url.hostname === 'airportdb.io' && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clonedResponse = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.open(API_CACHE).then((cache) => {
            return cache.match(request).then((cachedResponse) => {
              return cachedResponse || new Response(JSON.stringify({ error: 'Offline and not cached' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
          });
        })
    );
    return;
  }

  // ✅ Everything else: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
