const CACHE_NAME = 'vfr-navlog-cache-v1';
const API_CACHE = 'airport-api-cache';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
  // Add other static assets here only if you're 100% sure they exist
];

// Install event — cache essential static files
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        urlsToCache.map((url) => cache.add(url))
      );

      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn('❌ Failed to cache:', urlsToCache[i], result.reason);
        }
      });
    })
  );
});

// Activate and take control of the page immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Main fetch handler
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle navigation (e.g. refresh)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Handle API requests to airportdb.io (network first, cache fallback)
  if (url.hostname === 'airportdb.io' && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.open(API_CACHE).then((cache) =>
            cache.match(request).then((cachedResponse) => {
              return (
                cachedResponse ||
                new Response(JSON.stringify({ error: 'Offline and not cached' }), {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                })
              );
            })
          )
        )
    );
    return;
  }

  // All other requests: try network first, then cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          return (
            cachedResponse ||
            new Response('Offline and no cached version available.', {
              status: 504,
              headers: { 'Content-Type': 'text/plain' }
            })
          );
        })
      )
  );
});
