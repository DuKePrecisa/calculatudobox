self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Deixa o site buscar os arquivos normalmente da web/cloudflare
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
