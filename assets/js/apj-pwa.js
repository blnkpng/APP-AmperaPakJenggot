/* APP-V.4.6 — PWA App Mode
   Registers service worker only on HTTPS/localhost.
   No visual UI changes and no API behavior changes. */
(function () {
  'use strict';

  var canUseServiceWorker = 'serviceWorker' in navigator;
  var isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (!canUseServiceWorker || !isSecure) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .catch(function (err) {
        // PWA gagal register tidak boleh mengganggu login/stok/absensi.
        try { console.warn('[APJ PWA] Service worker gagal:', err); } catch (_) {}
      });
  });
})();
