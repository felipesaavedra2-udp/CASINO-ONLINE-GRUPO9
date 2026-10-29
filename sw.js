// Cambiar VERSION al publicar cambios en los recursos esenciales.
const VERSION = '1359f3a80fcdd32c';
const PREFIJO_CACHE = 'casino-shell-';
const CACHE = PREFIJO_CACHE + VERSION;
const SHELL = [
  "/",
  "/admin/estadisticas.html",
  "/admin/juegos.html",
  "/admin/panel.html",
  "/admin/partidas.html",
  "/admin/usuarios.html",
  "/css/style.css",
  "/icons/icono-192.png",
  "/icons/icono-512.png",
  "/index.html",
  "/js/componentes/avisoConexion.js",
  "/js/componentes/estadoVista.js",
  "/js/componentes/filaCrud.js",
  "/js/componentes/formApuesta.js",
  "/js/componentes/formCrud.js",
  "/js/componentes/pagina.js",
  "/js/controladores/JuegoController.js",
  "/js/controladores/PartidaController.js",
  "/js/controladores/ReporteController.js",
  "/js/controladores/UsuarioController.js",
  "/js/controladores/navegacion.js",
  "/js/estadoVista.js",
  "/js/formato.js",
  "/js/inicializarJuegos.js",
  "/js/main.js",
  "/js/pwa.js",
  "/js/repositorio/LocalStorageRepository.js",
  "/js/repositorio/Repository.js",
  "/js/servicios/JuegoService.js",
  "/js/servicios/PartidaService.js",
  "/js/servicios/ReporteService.js",
  "/js/servicios/UsuarioService.js",
  "/js/util/formato.js",
  "/js/vendor/alpine-3.14.8.min.js",
  "/jugador/blackjack.html",
  "/jugador/dashboard.html",
  "/jugador/historial.html",
  "/jugador/inicio.html",
  "/jugador/juegos.html",
  "/jugador/ranking.html",
  "/jugador/ruleta.html",
  "/manifest.json",
  "/menu.html",
  "/registro.html"
];
const RUTAS = new Set(SHELL);

self.addEventListener('install', evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map(ruta => new Request(ruta, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres
      .filter(nombre => nombre !== CACHE &&
        (nombre.startsWith(PREFIJO_CACHE) || nombre === 'casino-v1'))
      .map(nombre => caches.delete(nombre)));
    await self.clients.claim();
  })());
});

async function responder(evento, ruta) {
  const cache = await caches.open(CACHE);
  try {
    // La caché HTTP tampoco debe ocultar correcciones recientes.
    const respuesta = await fetch(new Request(evento.request, { cache: 'no-store' }));
    if (respuesta.ok) {
      try {
        await cache.put(ruta, respuesta.clone());
      } catch (error) {
        console.warn('No se pudo actualizar la copia sin conexión.', ruta, error);
      }
    }
    return respuesta;
  } catch {
    return (await cache.match(ruta)) || Response.error();
  }
}

self.addEventListener('fetch', evento => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== 'GET' || url.origin !== self.location.origin ||
      !RUTAS.has(url.pathname)) return;
  evento.respondWith(responder(evento, url.pathname));
});
