export function crearFilaCrud(entidad) {
  return {
    editar(item) {
      this.$dispatch('editar-' + entidad, { ...item });
    },

    eliminar(id) {
      this.$dispatch('eliminar-' + entidad, { id });
    },

    alternar(id) {
      this.$dispatch('alternar-' + entidad, { id });
    },
  };
}
