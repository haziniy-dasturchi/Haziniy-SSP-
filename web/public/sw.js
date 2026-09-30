// Service Worker for Haziniy SSP PWA
const CACHE_NAME = 'haziniy-ssp-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/brand/logo-full-on-green.png',
  '/brand/logo-full-on-white.png',
  '/brand/logo-mark.png',
  '/brand/pwa-192x192.png',
  '/brand/pwa-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  // Ignore chrome-extension or supabase API calls
  if (event.request.url.includes('/rest/v1/') || event.request.url.includes('/auth/v1/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache static assets dynamically
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.endsWith('.js') || event.request.url.endsWith('.css') || event.request.url.includes('/brand/'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
