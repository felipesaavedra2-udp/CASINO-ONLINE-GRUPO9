import { Repository } from './Repository.js';

const PREFIJO = 'casino:';

function leer(coleccion) {
  try {
    const guardado = localStorage.getItem(PREFIJO + coleccion);
    return guardado ? JSON.parse(guardado) : [];
  } catch {
    return [];
  }
}

function guardar(coleccion, items) {
  localStorage.setItem(PREFIJO + coleccion, JSON.stringify(items));
}

function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export class LocalStorageRepository extends Repository {
  async listar(coleccion) {
    return leer(coleccion);
  }

  async crear(coleccion, item) {
    const items = leer(coleccion);
    const nuevo = { ...item, id: item.id ?? nuevoId() };
    items.push(nuevo);
    guardar(coleccion, items);
    return nuevo;
  }

  async editar(coleccion, item) {
    const items = leer(coleccion);
    const posicion = items.findIndex((elemento) => elemento.id === item.id);

    if (posicion === -1) {
      throw new Error('El registro ya no existe.');
    }

    items[posicion] = { ...items[posicion], ...item };
    guardar(coleccion, items);
    return items[posicion];
  }

  async eliminar(coleccion, id) {
    const items = leer(coleccion);
    guardar(coleccion, items.filter((elemento) => elemento.id !== id));
  }
}
