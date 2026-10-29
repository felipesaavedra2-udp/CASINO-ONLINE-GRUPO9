import { Repository } from './Repository.js';

const PREFIJO = 'casino:';
const ESTADO = 'casino:estadoPartidas';
const COLECCIONES = ['usuarios', 'partidas', 'manosBlackjack'];
const COLAS = new WeakMap();

function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export class LocalStorageRepository extends Repository {
  constructor(almacen = globalThis.localStorage, bloqueos = globalThis.navigator?.locks) {
    super();
    this.almacen = almacen;
    this.bloqueos = bloqueos;
  }

  estadoPartidas() {
    const texto = this.almacen.getItem(ESTADO);
    if (texto === null) return null;
    const estado = JSON.parse(texto);
    if (!estado || !COLECCIONES.every(c => Array.isArray(estado[c]))) {
      throw new Error('El estado de partidas guardado no es válido.');
    }
    return estado;
  }

  leer(coleccion) {
    if (COLECCIONES.includes(coleccion)) {
      const estado = this.estadoPartidas();
      if (estado) return estado[coleccion];
    }
    const texto = this.almacen.getItem(PREFIJO + coleccion);
    const items = texto === null ? [] : JSON.parse(texto);
    if (!Array.isArray(items)) throw new Error('La colección guardada no es válida.');
    return items;
  }

  guardar(coleccion, items) {
    const estado = COLECCIONES.includes(coleccion) ? this.estadoPartidas() : null;
    if (estado) {
      if (coleccion === 'usuarios') {
        for (const mano of estado.manosBlackjack.filter(m => m.estado === 'jugando')) {
          const usuario = items.find(u => u.id === mano.usuarioId);
          const reservado = estado.manosBlackjack
            .filter(m => m.usuarioId === mano.usuarioId && m.estado === 'jugando')
            .reduce((suma, m) => suma + m.monto, 0);
          if (!usuario || usuario.saldo < reservado) {
            throw new Error('No se puede eliminar ni gastar el saldo reservado de una mano en juego.');
          }
        }
      }
      estado[coleccion] = items;
      this.almacen.setItem(ESTADO, JSON.stringify(estado));
    } else {
      this.almacen.setItem(PREFIJO + coleccion, JSON.stringify(items));
    }
  }

  bloquear(accion) {
    if (this.bloqueos?.request) {
      return this.bloqueos.request('casino:escritura', accion);
    }
    // Compatibilidad para operaciones existentes; las apuestas exigen Web Locks.
    const anterior = COLAS.get(this.almacen) ?? Promise.resolve();
    const actual = anterior.then(accion);
    COLAS.set(this.almacen, actual.catch(() => {}));
    return actual;
  }

  async transaccionPartidas(accion) {
    if (!this.bloqueos?.request) {
      throw new Error('Para operar partidas se necesita HTTPS o localhost y un navegador con Web Locks.');
    }
    return this.bloquear(() => {
      const estado = {
        usuarios: this.leer('usuarios'),
        partidas: this.leer('partidas'),
        manosBlackjack: this.leer('manosBlackjack'),
        juegos: this.leer('juegos'),
      };
      const resultado = accion(estado);
      if (resultado?.then) throw new Error('La transacción debe ser síncrona.');
      // Una sola escritura atómica: si setItem falla, no cambia ninguna colección.
      const { usuarios, partidas, manosBlackjack } = estado;
      this.almacen.setItem(ESTADO, JSON.stringify({ usuarios, partidas, manosBlackjack }));
      return resultado;
    });
  }

  async listar(coleccion) {
    return this.leer(coleccion);
  }

  async crear(coleccion, item) {
    return this.bloquear(() => {
      const items = this.leer(coleccion);
      const nuevo = { ...item, id: item.id ?? nuevoId() };
      items.push(nuevo);
      this.guardar(coleccion, items);
      return nuevo;
    });
  }

  async editar(coleccion, item) {
    return this.bloquear(() => {
      const items = this.leer(coleccion);
      const posicion = items.findIndex(elemento => elemento.id === item.id);
      if (posicion === -1) throw new Error('El registro ya no existe.');
      items[posicion] = { ...items[posicion], ...item };
      this.guardar(coleccion, items);
      return items[posicion];
    });
  }

  async eliminar(coleccion, id) {
    return this.bloquear(() => {
      this.guardar(coleccion, this.leer(coleccion).filter(item => item.id !== id));
    });
  }
}
