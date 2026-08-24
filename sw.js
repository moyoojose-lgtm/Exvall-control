// Exvall Sary — Service Worker
// El valor de CACHE_NAME se actualiza SOLO, automáticamente, por GitHub Actions
// en cada push a main (ver .github/workflows/tests.yml, job "version-sw").
// No hace falta cambiarlo a mano nunca — si lo editas manualmente aquí, el
// siguiente push lo volverá a sobrescribir con el hash calculado automáticamente.
const CACHE_NAME = 'exvall-sary-e206f384d4';

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
    })
    // Nota: ya NO se llama a self.skipWaiting() aquí. El Service Worker nuevo
    // se queda "esperando" hasta que la persona pulse el aviso de "nueva versión
    // disponible" en la app (ver index.html / mensaje SKIP_WAITING más abajo).
    // Así evitamos que la app cambie de versión sin avisar mientras se está usando.
  );
});

// Permite que la app (index.html) fuerce la activación del SW nuevo
// cuando la persona pulsa el aviso de "nueva versión disponible".
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Aviso push (recordatorio lunes/jueves de anotar el finde).
self.addEventListener('push', event => {
  let data = { title: 'Exvall Sary', body: 'Tienes un aviso nuevo.' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Exvall Sary', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
    })
  );
});

// Al pulsar la notificación, abre la app (o la enfoca si ya está abierta).
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const existente = clientsArr.find(c => c.url.includes(self.registration.scope));
      if (existente) return existente.focus();
      return self.clients.openWindow('./');
    })
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
