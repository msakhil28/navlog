self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle airportdb.io API requests with network-first + cache fallback
  if (url.hostname === 'airportdb.io' && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const clonedResponse = networkResponse.clone();
            caches.open(API_CACHE).then(cache => cache.put(request, clonedResponse));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.open(API_CACHE).then(cache =>
            cache.match(request).then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              return new Response(JSON.stringify({ error: 'Offline and not cached' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            })
          );
        })
    );
    return;
  }

  // All other requests (static files): network-first + cache fallback
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
