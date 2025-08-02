const STATIC_CACHE = 'vfr-navlog-static-v1';
const API_CACHE = 'vfr-navlog-api-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Add other static files as needed
];

// Cache static files during install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate and clean old caches if any
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, API_CACHE].includes(key)) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ✅ Handle API calls — always fetch fresh, cache only if fetch succeeds
  if (url.hostname === 'airportdb.io' && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, cloned));
            return networkResponse;
          }
          throw new Error('Network response not OK');
        })
        .catch(() =>
          caches.open(API_CACHE).then((cache) =>
            cache.match(request).then((cached) =>
              cached ||
              new Response(
                JSON.stringify({ error: 'Offline and no cached API response' }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' },
                }
              )
            )
          )
        )
    );
    return;
  }

  // ✅ Handle navigation (HTML) or static files
  if (
    request.mode === 'navigate' ||
    STATIC_ASSETS.includes(url.pathname) ||
    url.origin === location.origin
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => networkResponse)
        .catch(() =>
          caches.match(request).then((cached) =>
            cached ||
            caches.match('./index.html') || // fallback for navigations
            new Response('Offline and no cache available.', {
              status: 504,
              headers: { 'Content-Type': 'text/plain' },
            })
          )
        )
    );
    return;
  }

  // ✅ For everything else: just try network, no cache fallback
  event.respondWith(fetch(request));
});
