export function formatearCreditos(valor, conSigno = false) {
  const numero = Number(valor) || 0;
  const texto = Math.abs(numero).toLocaleString('es-CL');

  if (numero < 0) return `-${texto}`;
  if (conSigno && numero > 0) return `+${texto}`;
  return texto;
}

export function formatearFecha(fechaIso) {
  const fecha = new Date(fechaIso);

  if (Number.isNaN(fecha.getTime())) return '—';

  return fecha.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function textoEstado(activo) {
  return activo ? 'Activo' : 'Inactivo';
}

export function textoAccionEstado(activo) {
  return activo ? 'Desactivar' : 'Activar';
}
