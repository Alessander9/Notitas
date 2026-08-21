// Notitas Service Worker - PWA & Cache Management
const CACHE_NAME = 'notitas-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Limpiar cachés antiguas inmediatamente para evitar que sirvan chunks hash desactualizados
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar esquemas no http/https (ej: chrome-extension://, moz-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // 2. No interceptar peticiones mutables (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return;
  }


  // 3. No interceptar llamadas API ni endpoints dinámicos del backend
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/projects') ||
    url.pathname.startsWith('/notes') ||
    url.pathname.startsWith('/users')
  ) {
    return;
  }

  // 4. Los chunks JS/CSS (/assets/...) deben ir prioritariamente a la red
  // para que si hubo un nuevo deploy no se queden atascados con versiones antiguas
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 5. Para navegación HTML (SPA), buscar en red primero y fallback a index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 6. Para imágenes estáticas y fuentes, estrategia Stale-While-Revalidate segura
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (event.request.url.startsWith('http://') || event.request.url.startsWith('https://'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
