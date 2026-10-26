export function crearAcceso(usuarios, rol) {
  return {
    usuario: null,
    verificando: true,

    async init() {
      try {
        const usuarioActual = await usuarios.sesionActual();

        if (!usuarioActual || usuarioActual.rol !== rol) {
          window.location.href = '/index.html';
          return;
        }

        this.usuario = usuarioActual;
      } catch {
        window.location.href = '/index.html';
      } finally {
        this.verificando = false;
      }
    },
  };
}
