/* APP-V.4.6 — PWA Rotation Hotfix V79
   Tujuan:
   - Manifest tidak lagi di-cache oleh service worker.
   - CSS/JS dibaca network-first agar update setelah deploy cepat masuk.
   - Cache lama apj-static-* dibersihkan otomatis saat service worker aktif.
   - HTML/navigation dan Google Apps Script API tetap live/network.
*/

const APJ_PWA_VERSION = 'APP-V.4.6-FIX4-ROTATION-ANY-V79';
const APJ_STATIC_CACHE = 'apj-static-' + APJ_PWA_VERSION;

// Manifest sengaja TIDAK dimasukkan ke precache.
// Kalau manifest di-cache, device bisa tetap membaca orientation lama.
const APJ_CORE_ASSETS = [
  './assets/img/icons/apj-icon-192.png',
  './assets/img/icons/apj-icon-512.png'
];

function isSameOrigin_(url) {
  return url && url.origin === self.location.origin;
}

function isManifestRequest_(url) {
  return /\/?manifest\.webmanifest($|\?)/i.test(url.pathname);
}

function isHtmlOrNavigation_(request, url) {
  return request.mode === 'navigate' || /\.html($|\?)/i.test(url.pathname);
}

function isLocalStaticAsset_(url) {
  return /\/assets\/.*\.(css|js|png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname);
}

async function deleteOldApjCaches_() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => {
    if (key.indexOf('apj-static-') === 0 && key !== APJ_STATIC_CACHE) {
      return caches.delete(key);
    }
    return null;
  }));
}

async function deleteCachedManifestEverywhere_() {
  const keys = await caches.keys();
  await Promise.all(keys.map(async (key) => {
    const cache = await caches.open(key);
    const requests = await cache.keys();
    await Promise.all(requests.map((request) => {
      try {
        const url = new URL(request.url);
        if (isManifestRequest_(url)) return cache.delete(request);
      } catch (err) {}
      return null;
    }));
  }));
}

async function fetchManifestNoStore_(request) {
  const response = await fetch(request, { cache: 'reload' });
  if (!response) return response;

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function networkFirstStatic_(request) {
  const cache = await caches.open(APJ_STATIC_CACHE);

  try {
    const response = await fetch(request, { cache: 'reload' });
    if (response && response.status === 200 && response.type === 'basic') {
      cache.put(request, response.clone()).catch(() => null);
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APJ_STATIC_CACHE)
      .then((cache) => cache.addAll(APJ_CORE_ASSETS))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await deleteOldApjCaches_();
    await deleteCachedManifestEverywhere_();
    await self.clients.claim();

    // Beri sinyal ke tab/app yang sedang terbuka. Kalau halaman punya listener, ia bisa reload halus.
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => {
      try {
        client.postMessage({
          type: 'APJ_PWA_UPDATED',
          version: APJ_PWA_VERSION,
          message: 'PWA APJ diperbarui. Manifest dibaca ulang tanpa install ulang.'
        });
      } catch (err) {}
    });
  })());
});

self.addEventListener('message', (event) => {
  const data = event && event.data ? event.data : {};
  if (data && data.type === 'APJ_SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data && data.type === 'APJ_CLEAR_PWA_CACHE') {
    event.waitUntil((async () => {
      await deleteOldApjCaches_();
      await deleteCachedManifestEverywhere_();
    })());
  }
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
  if (!isSameOrigin_(url)) return;

  // Manifest wajib network-first/no-store supaya orientation terbaru kebaca.
  if (isManifestRequest_(url)) {
    event.respondWith(fetchManifestNoStore_(request));
    return;
  }

  // Jangan cache HTML/navigation agar update halaman tetap langsung hidup.
  if (isHtmlOrNavigation_(request, url)) return;

  if (!isLocalStaticAsset_(url)) return;

  // CSS/JS/icon network-first. Kalau offline/lambat baru pakai cache.
  event.respondWith(networkFirstStatic_(request));
});
