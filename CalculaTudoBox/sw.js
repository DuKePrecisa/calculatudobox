const CACHE_NAME = 'calculatudobox-v2';

// Lista de todas as páginas e recursos que funcionam 100% offline
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/calculadora.html',
  '/conversor-unidades.html',
  '/calculadora-porcentagem.html',
  '/calculadora-imc.html',
  '/calculadora-fonte-pc.html',
  '/manifest.json',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png'
];

// 1. Instalação: baixa e salva todos os arquivos essenciais no dispositivo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Salvando calculadoras offline no cache...');
      // Usa Promise.allSettled para que, se algum arquivo opcional faltar, não quebre o cache dos demais
      return Promise.allSettled(
        OFFLINE_URLS.map((url) => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// 2. Ativação: limpa caches antigos quando você atualizar a versão (ex: v2 -> v3)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptação de requisições: entrega rápido do cache ou busca na rede
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET (como chamadas POST para a API da IA)
  if (event.request.method !== 'GET') return;

  // Ignora scripts externos de anúncios (AdSense) ou analytics para não travar offline
  if (event.request.url.includes('googlesyndication') || event.request.url.includes('google-analytics')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se já está salvo no cache offline, entrega imediatamente e atualiza em segundo plano
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se estiver sem internet e for navegação de página, garante o retorno da home ou cache
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
