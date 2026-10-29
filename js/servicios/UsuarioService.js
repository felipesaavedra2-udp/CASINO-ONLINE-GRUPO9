const COLECCION = 'usuarios';
const SESION = 'sesion';
const ROLES = ['jugador', 'admin'];
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALDO_INICIAL = 1000;

function sinClave(usuario) {
  const { clave, ...resto } = usuario;
  return resto;
}

function normalizarCorreo(correo) {
  return String(correo ?? '').trim().toLowerCase();
}

export class UsuarioService {
  constructor(repo) {
    this.repo = repo;
  }

  asegurar() {
    if (!this.listo) this.listo = this.sembrar();
    return this.listo;
  }

  async sembrar() {
    const meta = await this.repo.listar('meta');
    if (meta.some(m => m.id === 'usuarios')) return;
    const creado = new Date().toISOString();
    const base = [
      { nombre: 'Administrador', correo: 'admin@casino.cl', clave: 'admin123', rol: 'admin', saldo: 0 },
      { nombre: 'Felipe', correo: 'felipe@casino.cl', clave: '1234', rol: 'jugador', saldo: 1250 },
      { nombre: 'Domingo', correo: 'domingo@casino.cl', clave: '1234', rol: 'jugador', saldo: 3150 },
      { nombre: 'Dautor', correo: 'dautor@casino.cl', clave: '1234', rol: 'jugador', saldo: 980 },
    ];
    for (const u of base) await this.repo.crear(COLECCION, { ...u, creado });
    await this.repo.crear('meta', { id: 'usuarios' });
  }

  async validar(datos, { creando }) {
    const nombre = String(datos.nombre ?? '').trim();
    const correo = normalizarCorreo(datos.correo);
    const clave = String(datos.clave ?? '');
    if (nombre.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.');
    if (!CORREO.test(correo)) throw new Error('Ingresa un correo válido.');
    if (creando && clave.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres.');
    if (!creando && clave !== '' && clave.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres.');
    const existentes = await this.repo.listar(COLECCION);
    if (existentes.some(u => u.correo === correo && u.id !== datos.id)) {
      throw new Error('Ya existe una cuenta con ese correo.');
    }
    return { nombre, correo, clave };
  }

  async listar() {
    await this.asegurar();
    const usuarios = await this.repo.listar(COLECCION);
    return usuarios.map(sinClave);
  }

  async obtener(id) {
    await this.asegurar();
    const usuarios = await this.repo.listar(COLECCION);
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) throw new Error('El usuario no existe.');
    return sinClave(usuario);
  }

  async registrar(datos) {
    await this.asegurar();
    if (datos.clave !== datos.confirmar) throw new Error('Las contraseñas no coinciden.');
    const limpio = await this.validar(datos, { creando: true });
    const usuario = await this.repo.crear(COLECCION, {
      ...limpio, rol: 'jugador', saldo: SALDO_INICIAL, creado: new Date().toISOString(),
    });
    await this.abrirSesion(usuario.id);
    return sinClave(usuario);
  }

  async crear(datos) {
    await this.asegurar();
    const limpio = await this.validar(datos, { creando: true });
    const rol = ROLES.includes(datos.rol) ? datos.rol : 'jugador';
    const saldo = Number(datos.saldo);
    if (!Number.isInteger(saldo) || saldo < 0) throw new Error('El saldo debe ser un entero mayor o igual a 0.');
    const usuario = await this.repo.crear(COLECCION, {
      ...limpio, rol, saldo, creado: new Date().toISOString(),
    });
    return sinClave(usuario);
  }

  async editar(datos) {
    await this.asegurar();
    const limpio = await this.validar(datos, { creando: false });
    const rol = ROLES.includes(datos.rol) ? datos.rol : 'jugador';
    const saldo = Number(datos.saldo);
    if (!Number.isInteger(saldo) || saldo < 0) throw new Error('El saldo debe ser un entero mayor o igual a 0.');
    const cambios = { id: datos.id, nombre: limpio.nombre, correo: limpio.correo, rol, saldo };
    if (limpio.clave !== '') cambios.clave = limpio.clave;
    const usuario = await this.repo.editar(COLECCION, cambios);
    return sinClave(usuario);
  }

  async eliminar(id) {
    await this.asegurar();
    const usuarios = await this.repo.listar(COLECCION);
    const objetivo = usuarios.find(u => u.id === id);
    if (!objetivo) throw new Error('El usuario ya no existe.');
    const sesion = await this.leerSesion();
    if (sesion && sesion.usuarioId === id) throw new Error('No puedes eliminar tu propia cuenta.');
    const admins = usuarios.filter(u => u.rol === 'admin');
    if (objetivo.rol === 'admin' && admins.length === 1) throw new Error('Debe quedar al menos un administrador.');
    await this.repo.eliminar(COLECCION, id);
  }

  async ajustarSaldo(id, variacion) {
    await this.asegurar();
    const usuarios = await this.repo.listar(COLECCION);
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) throw new Error('El usuario no existe.');
    const saldo = Math.max(0, Math.round(usuario.saldo + variacion));
    await this.repo.editar(COLECCION, { id, saldo });
    return saldo;
  }

  async leerSesion() {
    const sesiones = await this.repo.listar(SESION);
    return sesiones.find(s => s.id === 'actual') ?? null;
  }

  async abrirSesion(usuarioId) {
    await this.repo.eliminar(SESION, 'actual');
    await this.repo.crear(SESION, { id: 'actual', usuarioId });
  }

  async iniciarSesion(correo, clave) {
    await this.asegurar();
    const usuarios = await this.repo.listar(COLECCION);
    const usuario = usuarios.find(u => u.correo === normalizarCorreo(correo) && u.clave === String(clave ?? ''));
    if (!usuario) throw new Error('Correo o contraseña incorrectos.');
    await this.abrirSesion(usuario.id);
    return sinClave(usuario);
  }

  async sesionActual() {
    await this.asegurar();
    const sesion = await this.leerSesion();
    if (!sesion) return null;
    try {
      return await this.obtener(sesion.usuarioId);
    } catch (e) {
      return null;
    }
  }

  async cerrarSesion() {
    await this.repo.eliminar(SESION, 'actual');
  }
}
