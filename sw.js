// ================================================
// Cashflow PWA — Service Worker
// Versi: ubah angka ini setiap deploy baru
// ================================================
const CACHE_NAME   = 'cashflow-pwa-v1';
const OFFLINE_URL  = 'index.html';

// File yang di-cache saat install
const STATIC_FILES = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  // External CDN
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// ── Install ───────────────────────────────────────
// Pre-cache semua file statis
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_FILES);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activate ──────────────────────────────────────
// Hapus cache lama saat versi baru aktif
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch ─────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // 1. Selalu network-first untuk Apps Script API
  //    (data harus selalu fresh, tidak boleh di-cache)
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(
          JSON.stringify({ error: 'Tidak ada koneksi internet. Data tidak bisa dimuat.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2. Abaikan request non-GET (POST, dll)
  if (event.request.method !== 'GET') return;

  // 3. Cache-first untuk Google Fonts & CDN
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // 4. Network-first untuk file utama (index.html, manifest)
  //    Fallback ke cache jika offline
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Simpan response terbaru ke cache
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Offline: ambil dari cache
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// ── Background Sync (opsional) ────────────────────
// Akan berguna nanti jika ingin simpan transaksi offline
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-transaksi') {
    // Placeholder untuk future offline sync feature
    console.log('[SW] Background sync: sync-transaksi');
  }
});
