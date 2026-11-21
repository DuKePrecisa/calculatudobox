const CACHE_NAME = 'calculatudobox-v2';

// Liste aqui todos os arquivos HTML e ícones do seu site
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/calculadora.html',
  '/calculadora-cambio.html',
  '/calculadora-fonte-pc.html',
  '/calculadora-fps.html',
  '/calculadora-consumo.html',
  '/calculadora-imc.html',
  '/calculadora-porcentagem.html',
  '/conversor-unidades.html',
  '/privacidade.html',
  '/termos.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instala e salva os arquivos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Limpa caches antigos quando você atualizar a versão (ex: v1 para v2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Intercepta as requisições: tenta a rede primeiro; se estiver offline, pega do cache
self.addEventListener('fetch', (event) => {
  // Não faz cache da chamada da API de FPS (POST)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Atualiza o cache com a versão mais nova se houver internet
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
