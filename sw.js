/**
 * Service Worker para TaxPortal DIAN - PWA Mobile & Offline Support
 */

const CACHE_NAME = 'taxportal-cache-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/main.css',
  './css/components.css',
  './css/views.css',
  './js/app.js',
  './js/auth.js',
  './js/store.js',
  './js/client.js',
  './js/admin.js',
  './js/taxCalculator.js',
  './js/pdfExport.js'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => {
          return cache.add(url).catch((err) => {
            console.warn('Skipped caching:', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  // Network-First strategy so changes reflect immediately
  evt.respondWith(
    fetch(evt.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(evt.request, responseClone);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(evt.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (evt.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
