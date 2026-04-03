// Service Worker — Diagnostic ERP v2.0
const CACHE_NAME = 'diag-erp-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app assets, network-first for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls: network-first, queue if offline
  if (url.pathname.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Store failed sync requests for later
        return new Response(JSON.stringify({ queued: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // App assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
