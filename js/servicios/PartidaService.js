const COLECCION = 'partidas';
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const PALOS = ['♠', '♥', '♦', '♣'];
const RESULTADOS = ['Ganó', 'Perdió', 'Empate'];

export class PartidaService {
  constructor(repo, usuarios, juegos, azar = Math.random) {
    this.repo = repo;
    this.usuarios = usuarios;
    this.juegos = juegos;
    this.azar = azar;
  }

  async operar(accion) {
    await this.usuarios.asegurar();
    await this.juegos.asegurar();
    if (typeof this.repo.transaccionPartidas !== 'function') {
      throw new Error('El repositorio no admite operaciones de partidas atómicas.');
    }
    return this.repo.transaccionPartidas(accion);
  }

  usuarioEn(estado, id) {
    const usuario = estado.usuarios.find(u => u.id === id);
    if (!usuario) throw new Error('El usuario no existe.');
    return usuario;
  }

  reservadoEn(estado, id, excepto = null) {
    return estado.manosBlackjack
      .filter(m => m.usuarioId === id && m.estado === 'jugando' && m.id !== excepto)
      .reduce((suma, m) => suma + m.monto, 0);
  }

  disponibleEn(estado, id) {
    return this.usuarioEn(estado, id).saldo - this.reservadoEn(estado, id);
  }

  ajustarEn(estado, id, variacion, excepto = null) {
    const usuario = this.usuarioEn(estado, id);
    const saldo = usuario.saldo + variacion;
    if (!Number.isSafeInteger(saldo) || saldo < this.reservadoEn(estado, id, excepto)) {
      throw new Error('Saldo insuficiente: hay créditos gastados o reservados.');
    }
    usuario.saldo = saldo;
    return saldo;
  }

  juegoEn(estado, nombre) {
    const juego = estado.juegos.find(j => j.nombre === nombre);
    if (!juego || juego.activo !== true) {
      throw new Error(`${nombre} no existe o está desactivado.`);
    }
    return juego;
  }

  validarEn(estado, id, monto) {
    const usuario = this.usuarioEn(estado, id);
    if (usuario.rol !== 'jugador') throw new Error('Solo los jugadores pueden apostar.');
    if (!Number.isSafeInteger(monto) || monto < 1) {
      throw new Error('El monto debe ser un entero de al menos 1 crédito.');
    }
    if (monto > this.disponibleEn(estado, id)) throw new Error('Saldo insuficiente para esa apuesta.');
    return usuario;
  }

  async listar() {
    const partidas = await this.repo.listar(COLECCION);
    return partidas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  async listarPorUsuario(usuarioId) {
    const partidas = await this.listar();
    return partidas.filter(p => p.usuarioId === usuarioId);
  }

  async resumenJugador(usuarioId) {
    const partidas = await this.listarPorUsuario(usuarioId);
    return {
      jugadas: partidas.length,
      ganadas: partidas.filter(p => p.resultado === 'Ganó').length,
      neto: partidas.reduce((suma, p) => suma + p.neto, 0),
    };
  }

  async saldoDe(usuarioId) {
    const usuario = await this.usuarios.obtener(usuarioId);
    const manos = await this.repo.listar('manosBlackjack');
    const reservado = manos.filter(m => m.usuarioId === usuarioId && m.estado === 'jugando')
      .reduce((suma, m) => suma + m.monto, 0);
    return usuario.saldo - reservado;
  }

  async juegoActivo(nombre) {
    const juegos = await this.juegos.listar();
    const juego = juegos.find(j => j.nombre === nombre);
    return Boolean(juego && juego.activo === true);
  }

  async editar(datos) {
    if (!RESULTADOS.includes(datos.resultado)) throw new Error('El resultado debe ser Ganó, Perdió o Empate.');
    const neto = Number(datos.neto);
    if (!Number.isInteger(neto)) throw new Error('El neto debe ser un número entero.');
    return this.operar(estado => {
      const partida = estado.partidas.find(p => p.id === datos.id);
      if (!partida) throw new Error('La partida ya no existe.');
      this.ajustarEn(estado, partida.usuarioId, neto - partida.neto);
      Object.assign(partida, { resultado: datos.resultado, neto });
      return { ...partida };
    });
  }

  async eliminar(id) {
    return this.operar(estado => {
      const partida = estado.partidas.find(p => p.id === id);
      if (!partida) throw new Error('La partida ya no existe.');
      this.ajustarEn(estado, partida.usuarioId, -partida.neto);
      estado.partidas = estado.partidas.filter(p => p.id !== id);
    });
  }

  async buscar(id) {
    const partidas = await this.repo.listar(COLECCION);
    const partida = partidas.find(p => p.id === id);
    if (!partida) throw new Error('La partida ya no existe.');
    return partida;
  }

  async corregirSaldo(usuarioId, variacion) {
    return this.operar(estado => this.ajustarEn(estado, usuarioId, variacion));
  }

  async validarMonto(usuarioId, monto) {
    const valor = Number(monto);
    if (!Number.isSafeInteger(valor) || valor < 1) throw new Error('El monto debe ser un entero de al menos 1 crédito.');
    const usuario = await this.usuarios.obtener(usuarioId);
    if (usuario.rol !== 'jugador') throw new Error('Solo los jugadores pueden apostar.');
    if (valor > await this.saldoDe(usuarioId)) throw new Error('Saldo insuficiente para esa apuesta.');
    return { usuario, monto: valor };
  }

  async exigirJuegoActivo(nombre) {
    if (!(await this.juegoActivo(nombre))) throw new Error(`${nombre} está desactivado por el administrador.`);
  }

  registrarEn(estado, usuario, juego, monto, resultado, neto, detalle, mano = null) {
    if (!Number.isSafeInteger(neto)) throw new Error('El resultado excede el rango de créditos admitido.');
    this.ajustarEn(estado, usuario.id, neto, mano?.id);
    const partida = {
      id: mano?.id ?? Date.now().toString(36) + Math.random().toString(36).slice(2),
      usuarioId: usuario.id,
      usuario: usuario.nombre,
      juegoId: juego.id,
      juego: juego.nombre,
      monto, resultado, neto, detalle,
      fecha: new Date().toISOString(),
    };
    estado.partidas.push(partida);
    return partida;
  }

  async registrar(usuario, juego, monto, resultado, neto, detalle) {
    return this.operar(estado => {
      const actual = this.validarEn(estado, usuario.id, monto);
      const mesa = this.juegoEn(estado, juego);
      const partida = this.registrarEn(estado, actual, mesa, monto, resultado, neto, detalle);
      return { partida, saldo: this.disponibleEn(estado, actual.id) };
    });
  }

  colorDe(numero) {
    if (numero === 0) return 'verde';
    return ROJOS.has(numero) ? 'rojo' : 'negro';
  }

  validarApuestaRuleta(tipo, valor) {
    if (tipo === 'numero') {
      const n = Number(valor);
      if (valor === '' || !Number.isInteger(n) || n < 0 || n > 36) throw new Error('El número debe estar entre 0 y 36.');
    } else if (tipo === 'color') {
      if (!['rojo', 'negro'].includes(valor)) throw new Error('Elige rojo o negro.');
    } else if (tipo === 'rango') {
      if (!['1-18', '19-36'].includes(valor)) throw new Error('Elige el rango 1-18 o 19-36.');
    } else {
      throw new Error('Tipo de apuesta no válido.');
    }
  }

  ganaApuesta(tipo, valor, numero, color) {
    if (tipo === 'numero') return Number(valor) === numero;
    if (tipo === 'color') return color === valor;
    if (numero === 0) return false;
    return valor === '1-18' ? numero <= 18 : numero >= 19;
  }

  async girarRuleta(usuarioId, apuesta) {
    await this.exigirJuegoActivo('Ruleta');
    const tipo = apuesta.tipo;
    const valor = String(apuesta.valor ?? '').trim().toLowerCase();
    this.validarApuestaRuleta(tipo, valor);
    const { usuario, monto } = await this.validarMonto(usuarioId, apuesta.monto);

    const numero = Math.floor(this.azar() * 37);
    const color = this.colorDe(numero);
    const gano = this.ganaApuesta(tipo, valor, numero, color);
    const pago = tipo === 'numero' ? 35 : 1;
    const neto = gano ? monto * pago : -monto;
    const detalle = `Apostó a ${tipo} ${valor}; salió el ${numero} (${color})`;
    const { saldo } = await this.registrar(usuario, 'Ruleta', monto, gano ? 'Ganó' : 'Perdió', neto, detalle);
    return { numero, color, gano, neto, saldo };
  }

  carta() {
    return {
      valor: VALORES[Math.floor(this.azar() * VALORES.length)],
      palo: PALOS[Math.floor(this.azar() * PALOS.length)],
    };
  }

  puntaje(cartas) {
    let total = 0;
    let ases = 0;
    for (const c of cartas) {
      if (c.valor === 'A') { ases++; total += 11; }
      else if (['J', 'Q', 'K'].includes(c.valor)) total += 10;
      else total += Number(c.valor);
    }
    while (total > 21 && ases > 0) { total -= 10; ases--; }
    return total;
  }

  esNatural(cartas) {
    return cartas.length === 2 && this.puntaje(cartas) === 21;
  }

  exigirEnJuego(mano) {
    if (!mano || mano.estado !== 'jugando') throw new Error('No hay una mano en juego.');
  }

  async obtenerManoBlackjack(usuarioId) {
    const manos = await this.repo.listar('manosBlackjack');
    return manos.find(m => m.usuarioId === usuarioId && m.estado === 'jugando') ?? null;
  }

  manoEn(estado, solicitud) {
    const mano = estado.manosBlackjack.find(m => m.id === solicitud?.id);
    if (!mano || mano.usuarioId !== solicitud.usuarioId) throw new Error('La mano no existe.');
    if (mano.estado === 'jugando' && mano.revision !== solicitud.revision) {
      throw new Error('La mano cambió. Recarga para continuar con su estado actual.');
    }
    return mano;
  }

  async repartirBlackjack(usuarioId, monto) {
    return this.operar(estado => {
      const juego = this.juegoEn(estado, 'Blackjack');
      const valor = Number(monto);
      this.validarEn(estado, usuarioId, valor);
      if (estado.manosBlackjack.some(m => m.usuarioId === usuarioId && m.estado === 'jugando')) {
        throw new Error('Ya tienes una mano en juego. Recarga para continuarla.');
      }
      const mano = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        usuarioId, juegoId: juego.id, monto: valor,
        jugador: [this.carta(), this.carta()],
        crupier: [this.carta(), this.carta()],
        estado: 'jugando', revision: 0,
      };
      estado.manosBlackjack.push(mano);
      if (this.esNatural(mano.jugador) || this.esNatural(mano.crupier)) {
        return this.finalizarEn(estado, mano);
      }
      return { ...mano, saldo: this.disponibleEn(estado, usuarioId) };
    });
  }

  jugarCrupier(mano) {
    while (this.puntaje(mano.crupier) < 17) mano.crupier.push(this.carta());
  }

  async pedirCarta(solicitud) {
    return this.operar(estado => {
      const mano = this.manoEn(estado, solicitud);
      if (mano.estado === 'terminada') return { ...mano, saldo: this.disponibleEn(estado, mano.usuarioId) };
      mano.jugador.push(this.carta());
      mano.revision++;
      const puntos = this.puntaje(mano.jugador);
      if (puntos === 21) this.jugarCrupier(mano);
      if (puntos >= 21) return this.finalizarEn(estado, mano);
      return { ...mano, saldo: this.disponibleEn(estado, mano.usuarioId) };
    });
  }

  async plantarse(solicitud) {
    return this.operar(estado => {
      const mano = this.manoEn(estado, solicitud);
      if (mano.estado === 'terminada') return { ...mano, saldo: this.disponibleEn(estado, mano.usuarioId) };
      this.jugarCrupier(mano);
      return this.finalizarEn(estado, mano);
    });
  }

  async cerrar(solicitud) {
    return this.operar(estado => {
      const mano = this.manoEn(estado, solicitud);
      return this.finalizarEn(estado, mano);
    });
  }

  finalizarEn(estado, mano) {
    if (mano.estado === 'terminada') return { ...mano, saldo: this.disponibleEn(estado, mano.usuarioId) };
    const pj = this.puntaje(mano.jugador);
    const pc = this.puntaje(mano.crupier);
    const naturalJ = this.esNatural(mano.jugador);
    const naturalC = this.esNatural(mano.crupier);
    let resultado;
    let neto;
    if (pj > 21) { resultado = 'Perdió'; neto = -mano.monto; }
    else if (naturalJ && naturalC) { resultado = 'Empate'; neto = 0; }
    else if (naturalJ) { resultado = 'Ganó'; neto = Math.floor(mano.monto * 1.5); }
    else if (naturalC) { resultado = 'Perdió'; neto = -mano.monto; }
    else if (pc > 21 || pj > pc) { resultado = 'Ganó'; neto = mano.monto; }
    else if (pj < pc) { resultado = 'Perdió'; neto = -mano.monto; }
    else { resultado = 'Empate'; neto = 0; }

    const usuario = this.usuarioEn(estado, mano.usuarioId);
    const detalle = `Jugador ${pj} - Crupier ${pc}`;
    this.registrarEn(estado, usuario, { id: mano.juegoId, nombre: 'Blackjack' },
      mano.monto, resultado, neto, detalle, mano);
    Object.assign(mano, { estado: 'terminada', resultado, neto, revision: mano.revision + 1 });
    return { ...mano, saldo: this.disponibleEn(estado, mano.usuarioId) };
  }
}
