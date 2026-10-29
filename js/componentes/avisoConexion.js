

export function crearAvisoConexion() {
  return {
    enLinea: navigator.onLine,

    get sinConexion() {
      return !this.enLinea;
    },

    actualizar() {
      this.enLinea = navigator.onLine;
    },
  };
}
