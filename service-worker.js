/* APP-V.4.6 — PWA App Mode
   Safe service worker: caches only local static assets/icons.
   HTML pages and Google Apps Script API calls remain network/live. */

const APJ_PWA_VERSION = 'APP-V.4.6-FIX4-FAST-CALENDAR';
const APJ_STATIC_CACHE = 'apj-static-' + APJ_PWA_VERSION;

const APJ_CORE_ASSETS = [
  './manifest.webmanifest',
  './assets/img/icons/apj-icon-192.png',
  './assets/img/icons/apj-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APJ_STATIC_CACHE)
      .then((cache) => cache.addAll(APJ_CORE_ASSETS))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => {
        if (key.indexOf('apj-static-') === 0 && key !== APJ_STATIC_CACHE) {
          return caches.delete(key);
        }
        return null;
      })))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  // Jangan intercept Google Apps Script / domain luar.
  if (url.origin !== self.location.origin) return;

  // Jangan cache HTML/navigation agar update halaman tetap langsung hidup.
  if (request.mode === 'navigate' || /\.html($|\?)/i.test(url.pathname)) return;

  const isStaticAsset = /\/assets\/.*\.(css|js|png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname)
    || /manifest\.webmanifest$/i.test(url.pathname);

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(APJ_STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => null);
        return response;
      });
    })
  );
});
