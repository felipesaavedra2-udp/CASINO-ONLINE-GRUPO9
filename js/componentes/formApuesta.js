

export function crearFormRuleta() {
  return {
    borrador: { tipo: 'numero', valor: '', monto: '' },

    init() {
      this.$watch('borrador.tipo', () => {
        this.borrador.valor = '';
      });
    },

    get esNumero() {
      return this.borrador.tipo === 'numero';
    },

    get esColor() {
      return this.borrador.tipo === 'color';
    },

    get esRango() {
      return this.borrador.tipo === 'rango';
    },

    enviar() {
      this.$dispatch('apostar', { ...this.borrador, monto: Number(this.borrador.monto) });
    },
  };
}

export function crearFormMonto() {
  return {
    borrador: { monto: '' },

    enviar() {
      this.$dispatch('repartir', { monto: Number(this.borrador.monto) });
    },
  };
}
