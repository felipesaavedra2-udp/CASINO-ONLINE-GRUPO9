

import { estadoVista } from '../componentes/estadoVista.js';
import { formatearCreditos } from '../util/formato.js';

export function crearRuletaController(servicio, usuarioId) {
  return {
    ...estadoVista(),
    saldo: 0,
    disponible: true,
    resultado: null,

    get noDisponible() {
      return !this.disponible;
    },

    get sinResultado() {
      return this.resultado === null;
    },

    get mensajeResultado() {
      if (this.resultado === null) return '';
      const r = this.resultado;
      const detalle = `Salió el ${r.numero} (${r.color}). `;
      return r.gano
        ? `${detalle}¡Ganaste ${formatearCreditos(r.neto)} créditos!`
        : `${detalle}Perdiste ${formatearCreditos(-r.neto)} créditos.`;
    },

    async init() {
      await this.ejecutar(async () => {
        this.disponible = await servicio.juegoActivo('Ruleta');
        this.saldo = await servicio.saldoDe(usuarioId);
      });
    },

    async girar(apuesta) {
      await this.ejecutar(async () => {
        this.resultado = await servicio.girarRuleta(usuarioId, apuesta);
        this.saldo = this.resultado.saldo;
      });
    },
  };
}

export function crearBlackjackController(servicio, usuarioId) {
  return {
    ...estadoVista(),
    saldo: 0,
    disponible: true,
    mano: null,

    get noDisponible() {
      return !this.disponible;
    },

    get enJuego() {
      return this.mano !== null && this.mano.estado === 'jugando';
    },

    get terminada() {
      return this.mano !== null && this.mano.estado === 'terminada';
    },

    get puedeApostar() {
      return this.disponible && !this.enJuego;
    },

    get hayMano() {
      return this.mano !== null;
    },

    get sinMano() {
      return this.mano === null;
    },

    get cartasJugador() {
      return this.mano ? this.mano.jugador : [];
    },

    get cartasCrupier() {
      if (!this.mano) return [];
      if (this.mano.estado === 'terminada') return this.mano.crupier;
      return [this.mano.crupier[0], { oculta: true }];
    },

    get puntosJugador() {
      return this.mano ? servicio.puntaje(this.mano.jugador) : 0;
    },

    get puntosCrupier() {
      if (!this.mano) return 0;
      return servicio.puntaje(this.enJuego ? [this.mano.crupier[0]] : this.mano.crupier);
    },

    get mensajeResultado() {
      if (!this.terminada) return '';
      const m = this.mano;
      if (m.resultado === 'Ganó') return `¡Ganaste ${formatearCreditos(m.neto)} créditos!`;
      if (m.resultado === 'Perdió') return `Perdiste ${formatearCreditos(-m.neto)} créditos.`;
      return 'Empate: recuperas tu apuesta.';
    },

    etiqueta(carta) {
      return carta.oculta ? '?' : carta.valor + carta.palo;
    },

    claseCarta(carta) {
      return { oculta: Boolean(carta.oculta), rojo: carta.palo === '♥' || carta.palo === '♦' };
    },

    async init() {
      await this.ejecutar(async () => {
        this.disponible = await servicio.juegoActivo('Blackjack');
        this.mano = await servicio.obtenerManoBlackjack(usuarioId);
        this.saldo = await servicio.saldoDe(usuarioId);
      });
    },

    async repartir(datos) {
      await this.ejecutar(async () => {
        this.mano = await servicio.repartirBlackjack(usuarioId, datos.monto);
        this.saldo = this.mano.saldo;
      });
    },

    async pedir() {
      await this.ejecutar(async () => {
        this.mano = await servicio.pedirCarta(this.mano);
        if (this.mano.estado === 'terminada') this.saldo = this.mano.saldo;
      });
    },

    async plantarse() {
      await this.ejecutar(async () => {
        this.mano = await servicio.plantarse(this.mano);
        this.saldo = this.mano.saldo;
      });
    },

    nuevaMano() {
      this.mano = null;
      this.showError('');
    },
  };
}

export function crearHistorialController(servicio, usuarioId) {
  return {
    ...estadoVista(),
    partidas: [],
    resumen: { jugadas: 0, ganadas: 0, neto: 0 },

    get mostrarVacio() {
      return !this.cargando && !this.error && this.partidas.length === 0;
    },

    get mostrarLista() {
      return !this.cargando && this.partidas.length > 0;
    },

    async init() {
      await this.ejecutar(async () => {
        this.partidas = await servicio.listarPorUsuario(usuarioId);
        this.resumen = await servicio.resumenJugador(usuarioId);
      });
    },
  };
}

export function crearPartidasAdminController(servicio) {
  return {
    ...estadoVista(),
    partidas: [],

    get mostrarVacio() {
      return !this.cargando && !this.error && this.partidas.length === 0;
    },

    get mostrarLista() {
      return !this.cargando && this.partidas.length > 0;
    },

    async init() {
      await this.cargar();
    },

    async cargar() {
      await this.ejecutar(async () => {
        this.partidas = await servicio.listar();
      });
    },

    async guardar(datos) {
      await this.ejecutar(async () => {
        await servicio.editar(datos);
        this.partidas = await servicio.listar();
        this.$dispatch('guardado-partida');
      });
    },

    async eliminar(id) {
      await this.ejecutar(async () => {
        await servicio.eliminar(id);
        this.partidas = await servicio.listar();
      });
    },
  };
}
