const CACHE_NAME = 'calculatudobox-v3';

// Arquivos essenciais que o site precisa para rodar
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/calculadora.html',
  '/manifest.json'
];

// 1. Instalação: Salva os arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Ativação: Limpa os caches antigos
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

// 3. Busca: Tenta pegar da rede primeiro; se estiver offline, busca no cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Ignora requisições de anúncios, analytics e APIs externas (como a de Câmbio ou IA)
  const url = event.request.url;
  if (url.includes('googlesyndication') || url.includes('google-analytics') || url.includes('api') || url.includes('exchangerate')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a rede estiver funcionando, retorna normalmente
        return response;
      })
      .catch(() => {
        // Se cair a internet, tenta entregar o arquivo salvo no cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se não tiver nem no cache e nem na rede, retorna a página inicial por segurança
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
