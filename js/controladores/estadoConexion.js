export function crearEstadoConexion() {
  return {
    enLinea: navigator.onLine,

    actualizarEstado() {
      this.enLinea = navigator.onLine;
    },
  };
}
