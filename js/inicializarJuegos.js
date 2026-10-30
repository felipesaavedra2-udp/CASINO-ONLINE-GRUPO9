
import { LocalStorageRepository } from './repositorio/LocalStorageRepository.js';
import { JuegoService } from './servicios/JuegoService.js';
import {
  crearJuegosJugadorController,
  crearJuegosAdminController,
} from './controladores/JuegoController.js';
import { crearFormCrud } from './componentes/formCrud.js';
import { crearFilaCrud } from './componentes/filaCrud.js';

export function inicializarJuegos(
  Alpine,
  servicio = new JuegoService(new LocalStorageRepository()),
) {

  Alpine.data('juegosJugador', () =>
    crearJuegosJugadorController(servicio)
  );

  Alpine.data('juegosAdmin', () =>
    crearJuegosAdminController(servicio)
  );

  Alpine.data('formCrud', (entidad) =>
    crearFormCrud(entidad)
  );

  Alpine.data('filaCrud', (entidad) =>
    crearFilaCrud(entidad)
  );
}
