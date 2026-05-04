// Service Worker - Minha Orlando PWA
// Versão do cache - mude esse número quando atualizar arquivos
const CACHE_VERSION = 'v1';
const CACHE_NAME = `minha-orlando-${CACHE_VERSION}`;

// Arquivos do "app shell" - cacheados na instalação
const APP_SHELL = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Domínios que NÃO devem ser cacheados (sempre buscar fresco da rede)
const NO_CACHE_DOMAINS = [
  'supabase.co',
  'supabase.io',
  'queue-times.com',
  'open-meteo.com',
  'exchangerate-api.com',
  'api.openai.com'
];

// === INSTALAÇÃO ===
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versão', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

// === ATIVAÇÃO ===
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando versão', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('minha-orlando-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Limpando cache antigo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// === REQUISIÇÕES ===
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não interfere em chamadas POST/PUT/DELETE
  if (event.request.method !== 'GET') return;

  // Não cacheia APIs (sempre busca da rede)
  if (NO_CACHE_DOMAINS.some(domain => url.hostname.includes(domain))) {
    return; // deixa o navegador lidar normalmente
  }

  // Estratégia: Cache First, Network Fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Tem no cache - retorna e atualiza em background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => { /* offline, sem problema */ });
          return cachedResponse;
        }
        // Não tem no cache - busca da rede
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok && url.origin === location.origin) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Offline e não tem no cache - retorna fallback
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// === MENSAGENS DO APP ===
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});