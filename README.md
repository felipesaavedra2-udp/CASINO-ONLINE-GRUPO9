# UDP Grand Casino — Grupo 9

Casino online que opera con **créditos virtuales** (sin dinero real). Los jugadores se registran,
juegan **ruleta** y **blackjack**, revisan su historial y compiten en un ranking. Los administradores
gestionan juegos, usuarios y partidas, y consultan estadísticas generales.

CIT2308 — Desarrollo Web y Móvil · UDP 2026-2 · Entrega 2 (frontend dinámico, MVC y PWA).

## Integrantes

- Domingo Avila
- Felipe Saavedra
- Benjamin Vergara

## Funcionalidades implementadas

- Registro e inicio de sesión con vistas y navegación según el rol de jugador o administrador.
- Gestión de créditos virtuales y catálogo de juegos activos.
- Ruleta con apuestas a número, color o rango y blackjack con opciones para pedir carta o plantarse.
- Historial de partidas, ranking de jugadores y estadísticas personales y generales.
- Herramientas de administración para juegos, usuarios, saldos y partidas.
- Interfaz adaptable, aviso de conexión y recursos para instalación como aplicación web.

Los datos se guardan en el navegador; no se utiliza una base de datos central ni un servidor de
aplicación. Cada navegador y origen mantiene sus propios datos.

## Tecnologías

- HTML, CSS y JavaScript con módulos ES.
- Alpine.js 3.14.8, incluido localmente.
- Arquitectura MVC por dominios: vistas, controladores, servicios y repositorio.
- `localStorage` para persistencia y Web Locks para coordinar operaciones de partidas entre
  pestañas compatibles.
- Web App Manifest y Service Worker para las capacidades PWA.
- nginx en AWS EC2 para servir archivos estáticos.

## Acceso

| | |
|---|---|
| **Aplicación pública** | [https://52-70-77-187.sslip.io/](https://52-70-77-187.sslip.io/) |
| **IP elástica** | `52.70.77.187`, asociada a la instancia EC2 |
| **Versión publicada** | Commit `491503a` de `origin/develop` |
| **HTTPS** | Let's Encrypt; configurado en nginx |
| **PWA** | Service Worker registrado y activado en Chrome |

Usa el dominio HTTPS de la tabla para acceder a la aplicación y mantener un único origen para la
sesión, `localStorage` y el Service Worker.

## Rutas y vistas

| Ruta | Rol | Propósito |
|---|---|---|
| `/index.html` | público | Inicio de sesión |
| `/registro.html` | público | Alta de cuenta (recibe 1.000 créditos) |
| `/jugador/dashboard.html` | jugador | Mi cuenta: saldo y accesos rápidos |
| `/jugador/juegos.html` | jugador | Catálogo de juegos activos |
| `/jugador/ruleta.html` | jugador | Mesa de ruleta: apuesta a número, color o rango |
| `/jugador/blackjack.html` | jugador | Mesa de blackjack: pedir carta o plantarse |
| `/jugador/historial.html` | jugador | Historial de partidas propias y estadísticas |
| `/jugador/ranking.html` | jugador | Ranking por créditos netos |
| `/admin/panel.html` | admin | Resumen general y accesos |
| `/admin/juegos.html` | admin | CRUD de juegos, activar/desactivar |
| `/admin/usuarios.html` | admin | CRUD de usuarios y saldos |
| `/admin/partidas.html` | admin | Listar, corregir y anular partidas |
| `/admin/estadisticas.html` | admin | Estadísticas generales |

Las páginas privadas verifican sesión y rol antes de mostrar su contenido.

## Arquitectura

Cada dominio tiene **vista, controlador, servicio** y un único contrato de datos compartido.

```
index.html, registro.html, jugador/*.html, admin/*.html     VISTAS (Alpine, sin lógica)
js/
  main.js                       composition root: conecta servicios y componentes Alpine
  pwa.js                        registra el Service Worker
  inicializarJuegos.js          configura componentes de juegos
  controladores/                coordinan: reciben un servicio, traducen eventos en órdenes
  servicios/                    reglas de negocio: reciben el repositorio por constructor
  repositorio/
    Repository.js               contrato (clase base, métodos async)
    LocalStorageRepository.js   implementación: el único archivo que toca el almacenamiento
  componentes/                  piezas Alpine reutilizables (formularios, filas, menú, estados)
  estadoVista.js                estado de carga y error para vistas
  formato.js                    formato de créditos y fechas
  util/formato.js               compatibilidad: reexporta las funciones de formato
  vendor/                       Alpine 3.14.8 local y licencia MIT
tests/                          pruebas de regresión
sw.js · manifest.json · icons/  recursos PWA
```

| Dominio | Vistas | Controlador | Servicio |
|---|---|---|---|
| Usuarios | `index`, `registro`, `jugador/dashboard`, `admin/usuarios` | `UsuarioController.js` | `UsuarioService.js` |
| Juegos | `jugador/juegos`, `admin/juegos` | `JuegoController.js` | `JuegoService.js` |
| Partidas | `jugador/ruleta`, `jugador/blackjack`, `jugador/historial`, `admin/partidas` | `PartidaController.js` | `PartidaService.js` |
| Reportes | `jugador/ranking`, `admin/panel`, `admin/estadisticas` | `ReporteController.js` | `ReporteService.js` |

Flujo de una acción: **vista → controlador → servicio → repositorio**.
El HTML nunca valida ni guarda; el controlador nunca valida ni conoce el almacenamiento;
el servicio nunca sabe dónde se guardan los datos.

### Cambiar la fuente de datos

Hoy los datos viven en el navegador. Para pasar a una API (Entrega 3) se implementa el contrato
de repositorio y se adapta su creación en `js/main.js`. Las operaciones de partidas necesitan
además conservar la atomicidad de `transaccionPartidas`; una API debe proporcionar una transacción
equivalente en el servidor. No basta con sustituir lecturas y escrituras independientes.

Las vistas y controladores consumen los servicios mediante sus interfaces actuales.

## PWA

- `manifest.json` con nombre, íconos de 192 y 512 px, `display: standalone` y colores del tema.
- `sw.js` precarga las páginas, CSS, módulos JavaScript, íconos y Alpine local.
  Usa cachés `casino-shell-<VERSION>`, red primero y copia local cuando no hay conexión.
- `js/pwa.js` registra el Service Worker sin reutilizar su caché HTTP. Una actualización muestra
  un botón para recargar sin interrumpir automáticamente formularios o manos en curso.
- La activación elimina solo cachés anteriores propias, incluida la antigua `casino-v1`.
- **Al cambiar recursos esenciales, actualizar `VERSION` y revisar `SHELL` en `sw.js`.**
- Se necesita una primera instalación con conexión y servir el sitio por HTTPS o localhost.
  Una pestaña ya abierta conserva el JavaScript cargado hasta recargar.
- Se conservan los íconos de `icons/` y las copias aportadas en la raíz. El manifiesto utiliza `icons/`.
- El equipo confirmó HTTPS en el dominio público y que el Service Worker está registrado y
  activado en Chrome. El comportamiento offline debe probarse por separado en el navegador.

## Persistencia de partidas

El repositorio guarda usuarios, historial y manos de Blackjack en una sola escritura en
`casino:estadoPartidas` al confirmar la primera operación de partidas. Conserva las claves
anteriores y las interfaces de acceso para el resto de los módulos. Las manos reservan créditos,
se recuperan tras recargar y no se liquidan dos veces.

Las escrituras se coordinan con Web Locks entre pestañas. Sin soporte de Web Locks se rechazan
las operaciones de partidas. Los datos siguen siendo locales al navegador y al origen:
`localhost` y `127.0.0.1` mantienen almacenamientos distintos.

## Comprobaciones automatizadas

- Partidas, exclusivamente con almacenamiento simulado: servir el proyecto y abrir
  `/tests/partidas.regresion.html`.
- PWA y regresiones de partidas en un perfil y servidor temporales aislados:
  `py tests/pwa.regresion.py` (o `python3 tests/pwa.regresion.py`).
  Requiere Chrome; puede indicarse su ejecutable mediante la variable `CHROME_PATH`.
- `git diff --check` y `git diff --cached --check` comprueban espacios y marcadores de conflicto.

Estas pruebas no usan perfiles existentes ni modifican datos reales.

## Cómo correrlo en local

El Service Worker necesita que el sitio venga servido (no abierto como archivo):

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

## Despliegue público (AWS)

La aplicación se sirve como archivos estáticos desde una instancia **AWS EC2 con Ubuntu 24.04**.
La Elastic IP `52.70.77.187` está asociada a la instancia y el sitio público es
[https://52-70-77-187.sslip.io/](https://52-70-77-187.sslip.io/). La versión publicada corresponde
al commit `491503a` de `origin/develop`.

nginx sirve `/var/www/casino-nueva-version` como raíz del sitio. El archivo de sitio habilitado es
`/etc/nginx/sites-enabled/udp-grand-casino`. HTTPS está configurado con un certificado de Let's
Encrypt. nginx debe servir desde la raíz los recursos `/sw.js`, `/manifest.json`, `/icons/`,
`/css/` y `/js/`.

El Service Worker fue registrado y activado en Chrome. Antes de una entrega, comprueba también la
renovación del certificado y el comportamiento offline desde el dominio público; el registro del
worker por sí solo no confirma que todas las rutas funcionen sin conexión.

## Video de presentación

Enlace al video final: https://drive.google.com/file/d/19w3ddqyG025AQB6g61Ypy69q_gq3Ru4Y/view?usp=sharing

## Flujo Git

Ramas `feature/*` integradas a `develop` mediante pull request. Sin commits directos a `main`.

### Notas de desarrollo

El diseño "responsive" del dashboard y de las mesas de juego está pensado principalmente para pantallas de escritorio. En celulares con pantallas muy pequeñas podría requerir algo de "scroll" o ajustes visuales.

Como los datos actualmente viven en el "localStorage" del navegador, las cuentas y el saldo volverán a su estado inicial si se prueba la aplicación usando el modo incógnito.
