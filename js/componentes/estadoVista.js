

export function estadoVista() {
  return {
    cargando: false,
    error: '',

    showLoading(valor) {
      this.cargando = valor;
    },

    showError(mensaje) {
      this.error = mensaje;
    },

    async ejecutar(accion) {
      this.showLoading(true);
      this.showError('');
      try {
        return await accion();
      } catch (e) {
        this.showError(e.message || 'Ocurrió un error inesperado.');
      } finally {
        this.showLoading(false);
      }
    },
  };
}
