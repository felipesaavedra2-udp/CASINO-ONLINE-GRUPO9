import { LocalStorageRepository } from '../js/repositorio/LocalStorageRepository.js';
import { UsuarioService } from '../js/servicios/UsuarioService.js';
import { JuegoService } from '../js/servicios/JuegoService.js';
import { PartidaService } from '../js/servicios/PartidaService.js';
import { ReporteService } from '../js/servicios/ReporteService.js';
import { crearBlackjackController } from '../js/controladores/PartidaController.js';

function afirmar(valor, mensaje = 'Aserción fallida') {
  if (!valor) throw new Error(mensaje);
}
async function rechazar(accion) {
  let error;
  try { await accion(); } catch (e) { error = e; }
  afirmar(error instanceof Error, 'Se esperaba un error visible');
  return error;
}
function memoria() {
  const datos = new Map();
  return {
    fallar: false,
    getItem(clave) { return datos.get(clave) ?? null; },
    setItem(clave, valor) {
      if (this.fallar) { this.fallar = false; throw new Error('Persistencia simulada no disponible'); }
      datos.set(clave, String(valor));
    },
    volcado() { return JSON.stringify([...datos]); },
  };
}
function bloqueosSimulados() {
  let cola = Promise.resolve();
  return {
    request(nombre, accion) {
      const actual = cola.then(() => accion());
      cola = actual.catch(() => {});
      return actual;
    },
  };
}
async function escenario() {
  const almacen = memoria();
  const bloqueos = bloqueosSimulados();
  const repo = new LocalStorageRepository(almacen, bloqueos);
  const usuarios = new UsuarioService(repo);
  const juegos = new JuegoService(repo);
  await usuarios.asegurar();
  await juegos.asegurar();
  const usuario = (await usuarios.listar()).find(u => u.rol === 'jugador');
  const partidas = new PartidaService(repo, usuarios, juegos, () => 0);
  function otraInstancia() {
    const r = new LocalStorageRepository(almacen, bloqueos);
    return new PartidaService(r, new UsuarioService(r), new JuegoService(r), () => 0);
  }
  return { almacen, bloqueos, repo, usuarios, juegos, usuario, partidas, otraInstancia };
}
function cartas(partidas, valores = ['10', '8', '10', '7']) {
  const mazo = [...valores];
  partidas.carta = () => ({ valor: mazo.shift() ?? '2', palo: '♠' });
}
const apuesta = monto => ({ tipo: 'color', valor: 'rojo', monto });
async function comprobarConservacion(e) {
  const usuario = await e.usuarios.obtener(e.usuario.id);
  const historial = await e.partidas.listar();
  afirmar(usuario.saldo === e.usuario.saldo + historial.reduce((s, p) => s + p.neto, 0),
    'Saldo e historial no coinciden');
}
export async function ejecutarPruebas() {
  const resultados = [];
  async function prueba(nombre, accion) {
    await accion(await escenario());
    resultados.push(nombre);
  }
  for (const nombre of ['Ruleta', 'Blackjack']) {
    for (const modo of ['eliminado', 'desactivado', 'renombrado']) {
      await prueba(nombre + ' ' + modo, async e => {
        const juego = (await e.juegos.listar()).find(j => j.nombre === nombre);
        if (modo === 'eliminado') await e.juegos.eliminar(juego.id);
        if (modo === 'desactivado') await e.juegos.alternar(juego.id);
        if (modo === 'renombrado') await e.juegos.editar({ ...juego, nombre: 'Otro juego' });
        afirmar(!(await e.partidas.juegoActivo(nombre)));
        const antes = e.almacen.volcado();
        await rechazar(() => nombre === 'Ruleta'
          ? e.partidas.girarRuleta(e.usuario.id, apuesta(1))
          : e.partidas.repartirBlackjack(e.usuario.id, 1));
        afirmar(antes === e.almacen.volcado());
      });
    }
  }
  await prueba('Montos inválidos e insuficientes', async e => {
    for (const monto of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, e.usuario.saldo + 1]) {
      await rechazar(() => e.partidas.girarRuleta(e.usuario.id, apuesta(monto)));
      await rechazar(() => e.partidas.repartirBlackjack(e.usuario.id, monto));
    }
    afirmar((await e.partidas.listar()).length === 0);
  });
  await prueba('Ruleta: ganancias, pérdidas, historial y reportes', async e => {
    const gana = await e.partidas.girarRuleta(e.usuario.id, { tipo: 'numero', valor: '0', monto: 10 });
    afirmar(gana.neto === 350);
    const pierde = await e.partidas.girarRuleta(e.usuario.id, apuesta(10));
    afirmar(pierde.neto === -10);
    const reportes = new ReporteService(e.repo, e.usuarios, e.juegos);
    afirmar((await reportes.ranking())[0].neto === 340);
    afirmar((await reportes.general()).totalPartidas === 2);
    await comprobarConservacion(e);
  });
  await prueba('Reserva persistente y rechazo de segunda mano', async e => {
    cartas(e.partidas);
    const mano = await e.partidas.repartirBlackjack(e.usuario.id, e.usuario.saldo);
    afirmar(mano.saldo === 0 && await e.partidas.saldoDe(e.usuario.id) === 0);
    const otra = e.otraInstancia();
    afirmar((await otra.obtenerManoBlackjack(e.usuario.id)).id === mano.id);
    await rechazar(() => otra.girarRuleta(e.usuario.id, apuesta(1)));
    await rechazar(() => otra.repartirBlackjack(e.usuario.id, 1));
    await comprobarConservacion(e);
  });
  await prueba('Saldo libre se puede apostar sin gastar reserva', async e => {
    cartas(e.partidas);
    await e.partidas.repartirBlackjack(e.usuario.id, 100);
    await e.partidas.girarRuleta(e.usuario.id, apuesta(e.usuario.saldo - 100));
    afirmar(await e.partidas.saldoDe(e.usuario.id) === 0);
    await rechazar(() => e.partidas.girarRuleta(e.usuario.id, apuesta(1)));
    await comprobarConservacion(e);
  });
  await prueba('Dos instancias serializan apuestas simultáneas', async e => {
    const resultados = await Promise.allSettled([
      e.partidas.girarRuleta(e.usuario.id, apuesta(e.usuario.saldo)),
      e.otraInstancia().girarRuleta(e.usuario.id, apuesta(e.usuario.saldo)),
    ]);
    afirmar(resultados.filter(r => r.status === 'fulfilled').length === 1);
    afirmar((await e.partidas.listar()).length === 1);
    await comprobarConservacion(e);
  });
  await prueba('Liquidación repetida y concurrente es idempotente', async e => {
    cartas(e.partidas);
    const mano = await e.partidas.repartirBlackjack(e.usuario.id, 10);
    const [a, b] = await Promise.all([e.partidas.plantarse(mano), e.otraInstancia().plantarse(mano)]);
    afirmar(a.estado === 'terminada' && b.estado === 'terminada');
    await e.partidas.cerrar(mano);
    afirmar((await e.partidas.listar()).length === 1);
    afirmar((await e.usuarios.obtener(e.usuario.id)).saldo === e.usuario.saldo + 10);
    await comprobarConservacion(e);
  });
  await prueba('Una mano inventada no se liquida', async e => {
    await rechazar(() => e.partidas.cerrar({ id: 'inexistente', usuarioId: e.usuario.id }));
    afirmar((await e.partidas.listar()).length === 0);
  });
  await prueba('Cartas externas ignoradas y revisiones obsoletas rechazadas', async e => {
    cartas(e.partidas, ['2', '3', '10', '7', '2']);
    const mano = await e.partidas.repartirBlackjack(e.usuario.id, 10);
    const nueva = await e.partidas.pedirCarta({ ...mano, jugador: [{ valor: 'A' }, { valor: 'K' }] });
    afirmar(e.partidas.puntaje(nueva.jugador) === 7);
    await rechazar(() => e.partidas.pedirCarta(mano));
    await e.partidas.plantarse(nueva);
    await comprobarConservacion(e);
  });
  await prueba('Mano iniciada puede terminar tras desactivación', async e => {
    cartas(e.partidas);
    const mano = await e.partidas.repartirBlackjack(e.usuario.id, 10);
    const juego = (await e.juegos.listar()).find(j => j.nombre === 'Blackjack');
    await e.juegos.alternar(juego.id);
    afirmar((await e.partidas.plantarse(mano)).estado === 'terminada');
    await rechazar(() => e.partidas.repartirBlackjack(e.usuario.id, 1));
  });
  await prueba('Fallo de reserva no altera saldo, historial ni manos', async e => {
    cartas(e.partidas);
    const antes = e.almacen.volcado();
    e.almacen.fallar = true;
    await rechazar(() => e.partidas.repartirBlackjack(e.usuario.id, 10));
    afirmar(antes === e.almacen.volcado());
  });
  await prueba('Fallo de ruleta no deja historial ni saldo parcial', async e => {
    const antes = e.almacen.volcado();
    e.almacen.fallar = true;
    await rechazar(() => e.partidas.girarRuleta(e.usuario.id, apuesta(10)));
    afirmar(antes === e.almacen.volcado());
  });
  await prueba('Fallo de liquidación conserva reserva y permite reintentar', async e => {
    cartas(e.partidas);
    const mano = await e.partidas.repartirBlackjack(e.usuario.id, 10);
    const antes = e.almacen.volcado();
    e.almacen.fallar = true;
    await rechazar(() => e.partidas.plantarse(mano));
    afirmar(antes === e.almacen.volcado());
    await e.otraInstancia().plantarse(mano);
    afirmar((await e.partidas.listar()).length === 1);
    await comprobarConservacion(e);
  });
  await prueba('Editar y eliminar: fallos atómicos y errores visibles', async e => {
    await e.partidas.girarRuleta(e.usuario.id, apuesta(10));
    const partida = (await e.partidas.listar())[0];
    for (const accion of [
      () => e.partidas.editar({ id: partida.id, resultado: 'Ganó', neto: 10 }),
      () => e.partidas.eliminar(partida.id),
      () => e.partidas.corregirSaldo(e.usuario.id, 10),
    ]) {
      const antes = e.almacen.volcado();
      e.almacen.fallar = true;
      await rechazar(accion);
      afirmar(antes === e.almacen.volcado());
    }
    await e.partidas.editar({ id: partida.id, resultado: 'Ganó', neto: 10 });
    await comprobarConservacion(e);
    await e.partidas.eliminar(partida.id);
    await comprobarConservacion(e);
  });
  await prueba('No se revierte una ganancia ya gastada', async e => {
    await e.partidas.girarRuleta(e.usuario.id, { tipo: 'numero', valor: '0', monto: 10 });
    const ganancia = (await e.partidas.listar())[0];
    await e.partidas.girarRuleta(e.usuario.id, apuesta(e.usuario.saldo + 350));
    const antes = e.almacen.volcado();
    await rechazar(() => e.partidas.eliminar(ganancia.id));
    afirmar(antes === e.almacen.volcado());
    await comprobarConservacion(e);
  });
  await prueba('Edición de usuario respeta créditos reservados', async e => {
    cartas(e.partidas);
    await e.partidas.repartirBlackjack(e.usuario.id, 100);
    await rechazar(() => e.repo.editar('usuarios', { id: e.usuario.id, saldo: 0 }));
    await rechazar(() => e.repo.eliminar('usuarios', e.usuario.id));
    afirmar(await e.partidas.saldoDe(e.usuario.id) === e.usuario.saldo - 100);
  });
  await prueba('Sin bloqueo entre pestañas se rechaza operar', async e => {
    const repo = new LocalStorageRepository(e.almacen, null);
    const servicio = new PartidaService(repo, e.usuarios, e.juegos);
    const antes = e.almacen.volcado();
    await rechazar(() => servicio.girarRuleta(e.usuario.id, apuesta(10)));
    afirmar(antes === e.almacen.volcado());
  });
  await prueba('Datos corruptos no se sustituyen por colecciones vacías', async e => {
    e.almacen.setItem('casino:partidas', '{invalido');
    const antes = e.almacen.volcado();
    await rechazar(() => e.partidas.girarRuleta(e.usuario.id, apuesta(10)));
    afirmar(antes === e.almacen.volcado());
  });
  await prueba('Blackjack natural: pago único y sin reserva pendiente', async e => {
    cartas(e.partidas, ['A', 'K', '10', '7']);
    const mano = await e.partidas.repartirBlackjack(e.usuario.id, 10);
    afirmar(mano.estado === 'terminada' && mano.neto === 15);
    await e.partidas.cerrar(mano);
    afirmar(await e.partidas.obtenerManoBlackjack(e.usuario.id) === null);
    afirmar((await e.partidas.listar()).length === 1);
    await comprobarConservacion(e);
  });
  await prueba('Controlador recupera mano y muestra saldo disponible', async e => {
    cartas(e.partidas);
    const mano = await e.partidas.repartirBlackjack(e.usuario.id, 10);
    const controlador = crearBlackjackController(e.otraInstancia(), e.usuario.id);
    await controlador.init();
    afirmar(!controlador.error && controlador.mano.id === mano.id);
    afirmar(controlador.saldo === e.usuario.saldo - 10);
    await controlador.plantarse();
    afirmar(!controlador.error && controlador.terminada);
    afirmar(controlador.saldo === e.usuario.saldo + 10);
  });
  for (const caso of [
    { nombre: 'Blackjack perdido', cartas: ['10', '7', '10', 'Q'], neto: -10 },
    { nombre: 'Blackjack empatado', cartas: ['10', '8', '10', '8'], neto: 0 },
  ]) {
    await prueba(caso.nombre, async e => {
      cartas(e.partidas, caso.cartas);
      const mano = await e.partidas.repartirBlackjack(e.usuario.id, 10);
      const fin = await e.partidas.plantarse(mano);
      afirmar(fin.neto === caso.neto);
      afirmar(await e.partidas.obtenerManoBlackjack(e.usuario.id) === null);
      await comprobarConservacion(e);
    });
  }
  if (globalThis.navigator?.locks?.request) {
    await prueba('Web Locks nativo serializa dos repositorios en memoria', async e => {
      const r1 = new LocalStorageRepository(e.almacen, globalThis.navigator.locks);
      const r2 = new LocalStorageRepository(e.almacen, globalThis.navigator.locks);
      const servicios = [r1, r2].map(r =>
        new PartidaService(r, new UsuarioService(r), new JuegoService(r), () => 0));
      const resultados = await Promise.allSettled(servicios.map(s =>
        s.girarRuleta(e.usuario.id, apuesta(e.usuario.saldo))));
      afirmar(resultados.filter(r => r.status === 'fulfilled').length === 1);
      await comprobarConservacion(e);
    });
  }
  return resultados;
}
