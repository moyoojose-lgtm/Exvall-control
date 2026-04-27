// Exvall Sary — Service Worker v2
const CACHE_NAME = 'exvall-sary-v2';

// Recursos a cachear para uso offline
const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
];

// Instalación: cachear recursos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cachear recursos locales siempre, externos con catch (pueden fallar CORS)
      return cache.addAll(['./index.html']).then(() => {
        return Promise.allSettled(
          ASSETS.filter(a => a.startsWith('http')).map(url =>
            cache.add(url).catch(() => console.log('SW: no se pudo cachear', url))
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first para recursos estáticos, network-first para el resto
self.addEventListener('fetch', event => {
  // Solo manejar GET
  if (event.request.method !== 'GET') return;

  // Para Nominatim y OSRM (cálculo de rutas): siempre red, nunca cachear
  const url = event.request.url;
  if (url.includes('nominatim.openstreetmap.org') || url.includes('router.project-osrm.org')) {
    return; // Dejar pasar sin interceptar
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Sin red y sin caché: para la app principal devolver el index
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
