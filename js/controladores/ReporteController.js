import { estadoVista } from '../componentes/estadoVista.js';

export function crearRankingController(servicio) {
  return {
    ...estadoVista(),
    filas: [],

    get mostrarVacio() {
      return !this.cargando && !this.error && this.filas.length === 0;
    },

    get mostrarLista() {
      return !this.cargando && this.filas.length > 0;
    },

    async init() {
      await this.ejecutar(async () => {
        this.filas = await servicio.ranking();
      });
    },
  };
}

export function crearResumenGeneralController(servicio) {
  return {
    ...estadoVista(),
    datos: {
      totalUsuarios: 0, juegosActivos: 0, totalJuegos: 0, totalPartidas: 0,
      creditosApostados: 0, juegoMasJugado: '—', usuarioMasActivo: '—',
      partidasHoy: 0, creditosHoy: 0,
    },

    get mostrarDatos() {
      return !this.cargando && !this.error;
    },

    get juegosActivosTexto() {
      return `${this.datos.juegosActivos} de ${this.datos.totalJuegos}`;
    },

    async init() {
      await this.ejecutar(async () => {
        this.datos = await servicio.general();
      });
    },
  };
}
