// Service Worker - Minha Orlando PWA
// Versão do cache - mude esse número quando atualizar arquivos
const CACHE_VERSION = 'v47';
const CACHE_NAME = `minha-orlando-${CACHE_VERSION}`;

// Arquivos do "app shell" - cacheados na instalação
const APP_SHELL = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/pixie.png',
  '/castle.png'
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
  if (event.request.method !== 'GET') return;
  if (NO_CACHE_DOMAINS.some(domain => url.hostname.includes(domain))) return;

  const isNavigation = event.request.mode === 'navigate'
                    || event.request.destination === 'document';

  // === HTML / navegação: NETWORK FIRST ===
  // Sempre tenta a rede; só cai no cache se estiver offline.
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // === Assets estáticos: STALE WHILE REVALIDATE ===
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((resp) => {
        if (resp.ok && url.origin === location.origin) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => null);
      return cached || networkFetch;
    })
  );
});

// === MENSAGENS DO APP ===
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
