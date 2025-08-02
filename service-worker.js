const CACHE_NAME = 'vfr-navlog-cache-v1';
const API_CACHE = 'airport-api-cache';

const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Add more static assets here if needed
];

// Install static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Main fetch handler
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ✅ Handle page navigations (e.g., refresh)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // ✅ Handle airportdb.io API (network-first with cache fallback)
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
          return caches.open(API_CACHE).then((cache) =>
            cache.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              } else {
                return new Response(
                  JSON.stringify({ error: 'Offline and not cached' }),
                  {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                  }
                );
              }
            })
          );
        })
    );
    return;
  }

  // ✅ All other requests: network-first, then cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          } else {
            return new Response('Offline and no cached version available.', {
              status: 504,
              headers: { 'Content-Type': 'text/plain' }
            });
          }
        })
      )
  );
});
