importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log('[ServiceWorker] Workbox loaded successfully');

  workbox.core.setCacheNameDetails({
    prefix: 'uev-cache',
    suffix: 'v1',
    precache: 'app-shell',
    runtime: 'dynamic-cache'
  });

  // Skip waiting and claim clients immediately
  self.skipWaiting();
  workbox.core.clientsClaim();

  // Cache static assets (JS, CSS, HTML, WASM, Web Fonts)
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'document' ||
      request.destination === 'font' ||
      request.destination === 'image',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
        })
      ]
    })
  );

  // Cache SQL.js WASM binaries & external libraries
  workbox.routing.registerRoute(
    ({ url }) => url.origin.includes('cdnjs') || url.pathname.endsWith('.wasm'),
    new workbox.strategies.CacheFirst({
      cacheName: 'wasm-and-libs',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 60 * 24 * 60 * 60 // 60 Days
        })
      ]
    })
  );

  // Network-First for API requests with Cache Fallback for offline use
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60
        })
      ]
    })
  );

  // Fallback to index.html for navigation routes when offline
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async (options) => {
      try {
        return await workbox.strategies.NetworkFirst().handle(options);
      } catch (error) {
        return caches.match('/index.html') || caches.match('/');
      }
    }
  );
} else {
  console.log('[ServiceWorker] Workbox failed to load');
}
