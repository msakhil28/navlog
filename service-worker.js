self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Airport API calls - network first + cache fallback
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
          return caches.open(API_CACHE).then(cache => cache.match(request));
        })
    );
    return;
  }

  // All other requests: network first + cache fallback
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clonedResponse));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
