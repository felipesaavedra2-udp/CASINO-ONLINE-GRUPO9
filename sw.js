// Service Worker de UDP Grand Casino.
// Guarda el shell de la aplicación para que abra sin conexión.
// Al cambiar cualquier archivo del shell, sube la versión de CACHE (casino-v2, v3...).

const CACHE = 'casino-v1';
const SHELL = [
  '/',
  '/admin/estadisticas.html',
  '/admin/juegos.html',
  '/admin/panel.html',
  '/admin/partidas.html',
  '/admin/usuarios.html',
  '/css/style.css',
  '/icons/icono-192.png',
  '/icons/icono-512.png',
  '/index.html',
  '/js/componentes/avisoConexion.js',
  '/js/componentes/estadoVista.js',
  '/js/componentes/filaCrud.js',
  '/js/componentes/formApuesta.js',
  '/js/componentes/formCrud.js',
  '/js/componentes/navegacion.js',
  '/js/componentes/pagina.js',
  '/js/controladores/JuegoController.js',
  '/js/controladores/PartidaController.js',
  '/js/controladores/ReporteController.js',
  '/js/controladores/UsuarioController.js',
  '/js/main.js',
  '/js/repositorio/LocalStorageRepository.js',
  '/js/repositorio/Repository.js',
  '/js/servicios/JuegoService.js',
  '/js/servicios/PartidaService.js',
  '/js/servicios/ReporteService.js',
  '/js/servicios/UsuarioService.js',
  '/js/util/formato.js',
  '/jugador/blackjack.html',
  '/jugador/dashboard.html',
  '/jugador/historial.html',
  '/jugador/juegos.html',
  '/jugador/ranking.html',
  '/jugador/ruleta.html',
  '/manifest.json',
  '/registro.html',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js',
];

self.addEventListener('install', evento => {
  console.log('install: guardando el shell en el cache');
  evento.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(nombres.filter(n => n !== CACHE).map(n => caches.delete(n)))
    )
  );
});

self.addEventListener('fetch', evento => {
  evento.respondWith(
    caches.match(evento.request)
      .then(guardado => guardado || fetch(evento.request))
      .catch(() => {
        // sin red y sin copia guardada: una navegación vuelve a la portada
        if (evento.request.mode === 'navigate') return caches.match('/index.html');
        return Response.error();
      })
  );
});
