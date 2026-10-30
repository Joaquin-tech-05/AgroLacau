// Service worker: guarda la app en el teléfono para que abra sin señal.
// Al cambiar archivos de la app, subir VERSION para que los teléfonos descarguen la nueva.
var VERSION = 'v3';
var CACHE_APP = 'agrolacau-app-' + VERSION;
var CACHE_FUENTES = 'agrolacau-fuentes';
var CACHE_MAPA = 'agrolacau-mapa';
var MAXIMO_IMAGENES_MAPA = 4000;

var ARCHIVOS_APP = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/combinar.js',
  '/manifest.webmanifest',
  '/img/simbolo-blanco.png',
  '/img/logo-agrolacau.png',
  '/img/favicon.png',
  '/img/apple-touch-icon.png',
  '/img/icono-192.png',
  '/img/icono-512.png',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/images/layers.png',
  '/vendor/leaflet/images/layers-2x.png',
  '/vendor/chartjs/chart.umd.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_APP).then(function (c) { return c.addAll(ARCHIVOS_APP); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) {
      return k.indexOf('agrolacau-app-') === 0 && k !== CACHE_APP;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Fuentes de Google: se guardan la primera vez que se usan con señal.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE_FUENTES).then(function (c) {
      return c.match(req).then(function (guardada) {
        return guardada || fetch(req).then(function (r) { c.put(req, r.clone()); return r; });
      });
    }));
    return;
  }

  // Los datos del equipo nunca se guardan en caché: siempre van al servidor.
  // Imagen satelital: lo que se miró con señal queda guardado para verlo sin señal.
  if (url.hostname === 'server.arcgisonline.com') {
    e.respondWith(caches.open(CACHE_MAPA).then(function (c) {
      return c.match(req).then(function (guardada) {
        if (guardada) return guardada;
        return fetch(req).then(function (r) {
          if (r.ok) { c.put(req, r.clone()).then(function () { recortarMapa(c); }); }
          return r;
        });
      });
    }));
    return;
  }

  if (url.origin !== location.origin || url.pathname.indexOf('/api/') === 0) return;

  // Archivos de la app: con señal se busca la versión nueva (y se guarda); sin señal, la guardada.
  e.respondWith(
    fetch(req).then(function (r) {
      if (r.ok) {
        var copia = r.clone();
        caches.open(CACHE_APP).then(function (c) { c.put(req, copia); });
      }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (guardada) {
        return guardada || (req.mode === 'navigate' ? caches.match('/index.html') : undefined);
      });
    })
  );
});

// Evita que las imágenes del mapa llenen el teléfono: borra las más viejas pasado el máximo.
var guardadasDesdeRecorte = 0;
function recortarMapa(cache) {
  if (++guardadasDesdeRecorte < 100) return;
  guardadasDesdeRecorte = 0;
  cache.keys().then(function (claves) {
    claves.slice(0, Math.max(0, claves.length - MAXIMO_IMAGENES_MAPA)).forEach(function (k) { cache.delete(k); });
  });
}
