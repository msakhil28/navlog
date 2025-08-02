self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ✅ Special handling for airportdb.io - network-first + cache fallback
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

  // ✅ For all other requests: network-first + cache fallback
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          } else {
            // This avoids unhandled type errors
            return new Response('Offline and no cached version available.', {
              status: 504,
              headers: { 'Content-Type': 'text/plain' }
            });
          }
        })
      )
  );
});
