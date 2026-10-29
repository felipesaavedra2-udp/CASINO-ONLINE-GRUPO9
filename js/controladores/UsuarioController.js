import { estadoVista } from '../componentes/estadoVista.js';

function irAlArea(usuario) {
  window.location.href = usuario.rol === 'admin' ? '/admin/panel.html' : '/jugador/dashboard.html';
}

export function crearLoginController(servicio) {
  return {
    ...estadoVista(),
    correo: '',
    clave: '',

    get textoBoton() {
      return this.cargando ? 'Ingresando…' : 'Ingresar';
    },

    async init() {
      const usuario = await servicio.sesionActual().catch(() => null);
      if (usuario) irAlArea(usuario);
    },

    async entrar() {
      await this.ejecutar(async () => {
        const usuario = await servicio.iniciarSesion(this.correo, this.clave);
        irAlArea(usuario);
      });
    },
  };
}

export function crearRegistroController(servicio) {
  return {
    ...estadoVista(),
    nombre: '',
    correo: '',
    clave: '',
    confirmar: '',

    get textoBoton() {
      return this.cargando ? 'Creando cuenta…' : 'Crear cuenta';
    },

    async registrar() {
      await this.ejecutar(async () => {
        const usuario = await servicio.registrar({
          nombre: this.nombre,
          correo: this.correo,
          clave: this.clave,
          confirmar: this.confirmar,
        });
        irAlArea(usuario);
      });
    },
  };
}

export function crearCuentaController(servicio, usuarioId) {
  return {
    ...estadoVista(),
    perfil: { nombre: '', correo: '', saldo: 0, creado: '' },

    async init() {
      await this.ejecutar(async () => {
        this.perfil = await servicio.obtener(usuarioId);
      });
    },
  };
}

export function crearUsuariosAdminController(servicio) {
  return {
    ...estadoVista(),
    usuarios: [],

    get mostrarVacio() {
      return !this.cargando && !this.error && this.usuarios.length === 0;
    },

    get mostrarLista() {
      return !this.cargando && this.usuarios.length > 0;
    },

    async init() {
      await this.cargar();
    },

    async cargar() {
      await this.ejecutar(async () => {
        this.usuarios = await servicio.listar();
      });
    },

    async guardar(datos) {
      await this.ejecutar(async () => {
        if (datos.id) await servicio.editar(datos);
        else await servicio.crear(datos);
        this.usuarios = await servicio.listar();
        this.$dispatch('guardado-usuario');
      });
    },

    async eliminar(id) {
      await this.ejecutar(async () => {
        await servicio.eliminar(id);
        this.usuarios = await servicio.listar();
      });
    },
  };
}
