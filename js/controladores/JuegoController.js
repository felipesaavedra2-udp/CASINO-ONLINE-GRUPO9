import { crearEstadoVista } from '../estadoVista.js';

export function crearJuegosJugadorController(servicio) {
  return {
    ...crearEstadoVista(),
    juegos: [],

    get mostrarVacio() {
      return !this.cargando && !this.error && this.juegos.length === 0;
    },

    get mostrarLista() {
      return !this.cargando && this.juegos.length > 0;
    },

    async init() {
      await this.ejecutar(async () => {
        this.juegos = await servicio.listarActivos();
      });
    },
  };
}

export function crearJuegosAdminController(servicio) {
  return {
    ...crearEstadoVista(),
    juegos: [],

    get mostrarVacio() {
      return !this.cargando && !this.error && this.juegos.length === 0;
    },

    get mostrarLista() {
      return !this.cargando && this.juegos.length > 0;
    },

    async init() {
      await this.cargar();
    },

    async cargar() {
      await this.ejecutar(async () => {
        this.juegos = await servicio.listar();
      });
    },

    async guardar(datos) {
      await this.ejecutar(async () => {
        if (datos.id) await servicio.editar(datos);
        else await servicio.crear(datos);
        this.juegos = await servicio.listar();
        this.$dispatch('guardado-juego');
      });
    },

    async alternar(id) {
      await this.ejecutar(async () => {
        await servicio.alternar(id);
        this.juegos = await servicio.listar();
      });
    },

    async eliminar(id) {
      await this.ejecutar(async () => {
        await servicio.eliminar(id);
        this.juegos = await servicio.listar();
      });
    },
  };
}
