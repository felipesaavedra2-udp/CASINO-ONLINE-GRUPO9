const PLANTILLAS = {
  juego: { nombre: '', descripcion: '', ruta: '', activo: true },
  usuario: { nombre: '', correo: '', clave: '', rol: 'jugador', saldo: 0 },
  partida: { resultado: 'Ganó', neto: 0 },
};

const NOMBRES = { juego: 'juego', usuario: 'usuario', partida: 'partida' };

export function crearFormCrud(entidad) {
  return {
    borrador: { ...PLANTILLAS[entidad] },
    editando: false,

    get encabezado() {
      return (this.editando ? 'Editar ' : 'Nuevo ') + NOMBRES[entidad];
    },

    get accion() {
      return this.editando ? 'Guardar cambios' : 'Crear';
    },

    get requiereClave() {
      return !this.editando;
    },

    cargar(item) {
      const base = { ...PLANTILLAS[entidad] };
      for (const campo of Object.keys(base)) {
        if (campo in item) base[campo] = item[campo];
      }
      this.borrador = { ...base, id: item.id };
      this.editando = true;
    },

    enviar() {
      this.$dispatch('guardar-' + entidad, { ...this.borrador });
    },

    limpiar() {
      this.borrador = { ...PLANTILLAS[entidad] };
      this.editando = false;
    },
  };
}
