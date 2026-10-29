

export function crearPagina(usuarios, rol) {
  return {
    usuario: null,
    verificando: true,

    get autorizado() {
      return this.usuario !== null;
    },

    async init() {
      try {
        const actual = await usuarios.sesionActual();
        if (actual && actual.rol === rol) this.usuario = actual;
        else window.location.href = '/index.html';
      } catch (e) {
        window.location.href = '/index.html';
      } finally {
        this.verificando = false;
      }
    },
  };
}
