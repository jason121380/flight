const CACHE_NAME = 'flight-calendar-v5';
const CSV_CACHE_NAME = 'flight-csv-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// ── Install: pre-cache static assets ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== CSV_CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Stale-While-Revalidate for Google Sheets CSV
  // → Serve cached CSV immediately (if exists), then fetch fresh in background
  if (url.hostname.includes('google.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      caches.open(CSV_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);

        // Fetch fresh copy in background and update cache
        const networkFetch = fetch(event.request.clone())
          .then(response => {
            if (response.ok) {
              cache.put(event.request, response.clone());
              // Notify all clients that fresh data is available
              self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'CSV_UPDATED' }));
              });
            }
            return response;
          })
          .catch(() => null);

        // Return cached immediately if available, otherwise wait for network
        if (cached) {
          return cached;
        }
        return networkFetch || new Response('Network error', {
          status: 503,
          statusText: 'Network unavailable'
        });
      })
    );
    return;
  }

  // Cache-first for all other static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => new Response('Network error', {
        status: 503,
        statusText: 'Network unavailable'
      }));
    })
  );
});
