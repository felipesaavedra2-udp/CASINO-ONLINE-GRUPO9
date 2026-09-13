

const listaJuegos = document.querySelector('#lista-juegos');
listaJuegos.addEventListener('click', (event) => {
  const tarjeta = event.target.closest('.tarjeta');
  if (!tarjeta) return;

  if (event.target.matches('.boton-toggle')) {
    const estadoTexto = tarjeta.querySelector('.estado');
    const estaActivo = estadoTexto.classList.contains('estado-activo');
    estadoTexto.classList.toggle('estado-activo', !estaActivo);
    estadoTexto.classList.toggle('estado-inactivo', estaActivo);
    estadoTexto.textContent = estaActivo ? 'Estado: Inactivo' : 'Estado: Activo';
    event.target.textContent = estaActivo ? 'Activar' : 'Desactivar';
  }
});
