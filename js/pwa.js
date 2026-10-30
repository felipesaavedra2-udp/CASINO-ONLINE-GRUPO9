let registroIniciado = false;

function avisarActualizacion() {
  if (document.querySelector('#actualizacion-pwa')) return;
  const aviso = document.createElement('p');
  aviso.id = 'actualizacion-pwa';
  aviso.setAttribute('role', 'status');
  aviso.append('Hay una versión nueva de la aplicación. ');
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Recargar';
  boton.addEventListener('click', () => window.location.reload());
  aviso.appendChild(boton);
  document.body.prepend(aviso);
}

export async function registrarPWA() {
  if (registroIniciado || !window.isSecureContext || !('serviceWorker' in navigator)) return null;
  registroIniciado = true;
  const teniaControlador = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // No interrumpir formularios ni manos en curso con una recarga automática.
    if (teniaControlador) avisarActualizacion();
  });
  try {
    const registro = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    window.addEventListener('online', () => {
      registro.update().catch(error => console.warn('No se pudo comprobar la actualización PWA.', error));
    });
    return registro;
  } catch (error) {
    console.error('No se pudo instalar la aplicación sin conexión.', error);
    return null;
  }
}
