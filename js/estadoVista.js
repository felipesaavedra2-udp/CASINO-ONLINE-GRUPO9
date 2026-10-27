export function crearEstadoVista() {
  return {
    cargando: false,
    error: '',

    async ejecutar(accion) {
      this.cargando = true;
      this.error = '';

      try {
        return await accion();
      } catch (error) {
        this.error = error.message || 'Ocurrió un error inesperado.';
      } finally {
        this.cargando = false;
      }
    },
  };
}
