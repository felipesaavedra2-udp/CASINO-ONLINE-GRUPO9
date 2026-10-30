const COLECCION = 'juegos';
const RUTA = /^\/[\w\-./]*\.html$/;

export class JuegoService {
  constructor(repo) {
    this.repo = repo;
  }

  asegurar() {
    if (!this.listo) this.listo = this.sembrar();
    return this.listo;
  }

  async sembrar() {
    const meta = await this.repo.listar('meta');
    if (meta.some(m => m.id === 'juegos')) return;
    await this.repo.crear(COLECCION, {
      nombre: 'Ruleta',
      descripcion: 'Apuesta a un número, color o rango y veamos si es tu día de suerte.',
      ruta: '/jugador/ruleta.html',
      activo: true,
    });
    await this.repo.crear(COLECCION, {
      nombre: 'Blackjack',
      descripcion: 'Suma lo más cerca posible de 21 sin pasarte.',
      ruta: '/jugador/blackjack.html',
      activo: true,
    });
    await this.repo.crear('meta', { id: 'juegos' });
  }

  async validar(datos) {
    const nombre = String(datos.nombre ?? '').trim();
    const descripcion = String(datos.descripcion ?? '').trim();
    const ruta = String(datos.ruta ?? '').trim();
    if (nombre.length < 2) throw new Error('El nombre del juego debe tener al menos 2 caracteres.');
    if (descripcion.length > 200) throw new Error('La descripción no puede superar los 200 caracteres.');
    if (ruta !== '' && !RUTA.test(ruta)) throw new Error('La ruta debe comenzar con / y terminar en .html (ej: /jugador/ruleta.html).');
    const existentes = await this.repo.listar(COLECCION);
    if (existentes.some(j => j.nombre.toLowerCase() === nombre.toLowerCase() && j.id !== datos.id)) {
      throw new Error('Ya existe un juego con ese nombre.');
    }
    return { nombre, descripcion, ruta };
  }

  async listar() {
    await this.asegurar();
    return this.repo.listar(COLECCION);
  }

  async listarActivos() {
    const juegos = await this.listar();
    return juegos.filter(j => j.activo);
  }

  async crear(datos) {
    await this.asegurar();
    const limpio = await this.validar(datos);
    return this.repo.crear(COLECCION, { ...limpio, activo: datos.activo !== false });
  }

  async editar(datos) {
    await this.asegurar();
    const limpio = await this.validar(datos);
    return this.repo.editar(COLECCION, { id: datos.id, ...limpio, activo: datos.activo !== false });
  }

  async alternar(id) {
    await this.asegurar();
    const juegos = await this.repo.listar(COLECCION);
    const juego = juegos.find(j => j.id === id);
    if (!juego) throw new Error('El juego ya no existe.');
    return this.repo.editar(COLECCION, { id, activo: !juego.activo });
  }

  async eliminar(id) {
    await this.asegurar();
    await this.repo.eliminar(COLECCION, id);
  }
}
