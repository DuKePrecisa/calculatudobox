const CACHE_NAME = 'calculatudobox-v4';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/calculadora.html',
  '/manifest.json'
];

// 1. Instala e salva os arquivos na memória do aparelho
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Limpa caches antigos quando houver atualização
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Intercepta as requisições com foco em robustez offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignora chamadas externas (APIs de câmbio, IA, Google Analytics, anúncios)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se encontrou no cache, retorna imediatamente (garante velocidade e funcionamento offline)
      // E em segundo plano atualiza o cache caso haja internet
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Se a rede falhar silenciosamente, o usuário continua navegando pelo cache
      });

      return cachedResponse || fetchPromise;
    })
  );
});
