const ENLACES = {
  jugador: [
    { texto: 'Mi cuenta', ruta: '/jugador/dashboard.html' },
    { texto: 'Juegos', ruta: '/jugador/juegos.html' },
    { texto: 'Historial', ruta: '/jugador/historial.html' },
    { texto: 'Ranking', ruta: '/jugador/ranking.html' },
  ],
  admin: [
    { texto: 'Panel', ruta: '/admin/panel.html' },
    { texto: 'Juegos', ruta: '/admin/juegos.html' },
    { texto: 'Usuarios', ruta: '/admin/usuarios.html' },
    { texto: 'Partidas y apuestas', ruta: '/admin/partidas.html' },
    { texto: 'Estadísticas', ruta: '/admin/estadisticas.html' },
  ],
};

export function crearNavegacion(usuarios, rol) {
  return {
    abierto: false,
    enlaces: ENLACES[rol] || [],

    alternar() {
      this.abierto = !this.abierto;
    },

    actual(ruta) {
      return window.location.pathname === ruta ? 'page' : null;
    },

    async salir() {
      await usuarios.cerrarSesion();
      window.location.href = '/index.html';
    },
  };
}
