const PARTIDAS = 'partidas';

function esHoy(iso) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function masFrecuente(valores) {
  const cuentas = new Map();
  for (const v of valores) cuentas.set(v, (cuentas.get(v) ?? 0) + 1);
  let mejor = null;
  for (const [valor, veces] of cuentas) {
    if (mejor === null || veces > mejor.veces) mejor = { valor, veces };
  }
  return mejor ? mejor.valor : '—';
}

export class ReporteService {
  constructor(repo, usuarios, juegos) {
    this.repo = repo;
    this.usuarios = usuarios;
    this.juegos = juegos;
  }

  async ranking() {
    const partidas = await this.repo.listar(PARTIDAS);
    const porJugador = new Map();
    for (const p of partidas) {
      const fila = porJugador.get(p.usuarioId) ?? { usuario: p.usuario, partidas: 0, neto: 0 };
      fila.partidas += 1;
      fila.neto += p.neto;
      porJugador.set(p.usuarioId, fila);
    }
    return [...porJugador.values()]
      .sort((a, b) => b.neto - a.neto || b.partidas - a.partidas)
      .map((fila, i) => ({ posicion: i + 1, ...fila }));
  }

  async general() {
    const usuarios = await this.usuarios.listar();
    const juegos = await this.juegos.listar();
    const partidas = await this.repo.listar(PARTIDAS);
    const hoy = partidas.filter(p => esHoy(p.fecha));
    return {
      totalUsuarios: usuarios.length,
      juegosActivos: juegos.filter(j => j.activo).length,
      totalJuegos: juegos.length,
      totalPartidas: partidas.length,
      creditosApostados: partidas.reduce((suma, p) => suma + p.monto, 0),
      juegoMasJugado: masFrecuente(partidas.map(p => p.juego)),
      usuarioMasActivo: masFrecuente(partidas.map(p => p.usuario)),
      partidasHoy: hoy.length,
      creditosHoy: hoy.reduce((suma, p) => suma + p.monto, 0),
    };
  }
}
