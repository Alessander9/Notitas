// Notitas Service Worker con estrategia Stale-While-Revalidate para máximo rendimiento y PWA
const CACHE_NAME = 'notitas-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-notitas.png',
  '/notitas-texto.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No interceptar peticiones de API dinámicas ni autenticación
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/projects/') ||
    url.pathname.startsWith('/notes/') ||
    url.pathname.startsWith('/users/')
  ) {
    return;
  }

  // Estrategia Stale-While-Revalidate para assets estáticos, scripts, estilos y fuentes
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Guardar en caché solo respuestas válidas
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback sin conexión para documentos HTML
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return cache.match('/index.html');
            }
          });

        // Retorna inmediatamente la versión en caché si existe; en segundo plano actualiza
        return cachedResponse || fetchPromise;
      });
    })
  );
});
