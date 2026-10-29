# UDP Grand Casino — Grupo 9

Casino online que opera con **créditos virtuales** (sin dinero real). Los jugadores se registran,
juegan **ruleta** y **blackjack**, revisan su historial y compiten en un ranking. Los administradores
gestionan juegos, usuarios y partidas, y consultan estadísticas generales.

CIT2308 — Desarrollo Web y Móvil · UDP 2026-2 · Entrega 2 (frontend dinámico, MVC y PWA).

## Acceso

| | |
|---|---|
| **IP pública (IP elástica)** | `http://COMPLETAR-IP-ELASTICA` ← reemplazar por la IP elástica de la instancia EC2 |
| Servidor | nginx sirviendo el sitio estático en `/` |

> Con una **IP elástica** la dirección no cambia al apagar y encender la instancia.
> Si el servidor cambia de dirección, actualizar esta tabla.

### Cuentas de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@casino.cl` | `admin123` |
| Jugador | `felipe@casino.cl` | `1234` |

Los datos de ejemplo se crean solos la primera vez que se abre la aplicación en un navegador.
Cada navegador guarda sus propios datos.

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
  main.js                       composition root: el único archivo que crea objetos concretos
  controladores/                coordinan: reciben un servicio, traducen eventos en órdenes
  servicios/                    reglas de negocio: reciben el repositorio por constructor
  repositorio/
    Repository.js               contrato (clase base, métodos async)
    LocalStorageRepository.js   implementación: el único archivo que toca el almacenamiento
  componentes/                  piezas Alpine reutilizables (formularios, filas, menú, estados)
  util/formato.js               formato de créditos y fechas
sw.js · manifest.json · icons/  PWA
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

Hoy los datos viven en el navegador. Para pasar a una API (Entrega 3) se escribe otra clase que
extienda `Repository` y se cambia **una línea**: la primera sección de `js/main.js`, donde se elige
la implementación que reciben los servicios.

Ningún servicio, controlador ni vista cambia.

## PWA

- `manifest.json` con nombre, íconos de 192 y 512 px, `display: standalone` y colores del tema.
- `sw.js` guarda el shell (páginas, CSS, JS, íconos y la librería Alpine) en la caché `casino-v1`
  y responde desde ella. Sin conexión la app abre y un aviso lo indica.
- **Al modificar cualquier archivo del shell, subir la versión de `CACHE` en `sw.js`** (`casino-v2`, ...);
  si no, los navegadores seguirán viendo la copia anterior.

## Cómo correrlo en local

El Service Worker necesita que el sitio venga servido (no abierto como archivo):

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

En el servidor, nginx debe servir esta carpeta como raíz del sitio (`root` apuntando al proyecto),
de modo que `/sw.js` y `/manifest.json` queden en la raíz.

## Flujo Git

Ramas `feature/*` integradas a `develop` mediante pull request. Sin commits directos a `main`.

### Notas de desarrollo

El diseño "responsive" del dashboard y de las mesas de jjuego está pensado principalmente para pantallas de escritorio. En celulares con pantallas muy pequeñas podria requerir algo de "scroll" o ajustes visuales.

Como los datos actualmente viven en el "localStorage" del navegador, las cuentas y el saldo volverán a su estado inicial si se prueba la aplicación usando el modo incógnito.