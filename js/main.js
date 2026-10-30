import { registrarPWA } from './pwa.js';
import { LocalStorageRepository } from './repositorio/LocalStorageRepository.js';
import { UsuarioService } from './servicios/UsuarioService.js';
import { JuegoService } from './servicios/JuegoService.js';
import { ReporteService } from './servicios/ReporteService.js';
import { PartidaService } from './servicios/PartidaService.js';
import {
  crearRuletaController,
  crearBlackjackController,
  crearHistorialController,
  crearPartidasAdminController,
} from './controladores/PartidaController.js';
import { crearFormRuleta, crearFormMonto } from './componentes/formApuesta.js';
import {
  crearRankingController,
  crearResumenGeneralController,
} from './controladores/ReporteController.js';
import {
  crearLoginController,
  crearRegistroController,
  crearCuentaController,
  crearUsuariosAdminController,
} from './controladores/UsuarioController.js';
import { crearPagina } from './componentes/pagina.js';
import { crearNavegacion } from './controladores/navegacion.js';
import { crearAvisoConexion } from './componentes/avisoConexion.js';
import { inicializarJuegos } from './inicializarJuegos.js';
import { formatearCreditos, formatearFecha } from './formato.js';

const repo = new LocalStorageRepository();
const usuarios = new UsuarioService(repo);
const juegos = new JuegoService(repo);
const reportes = new ReporteService(repo, usuarios, juegos);
const partidas = new PartidaService(repo, usuarios, juegos);
let componentesRegistrados = false;

function registrarComponentes() {
  const Alpine = window.Alpine;
  if (!Alpine || componentesRegistrados) return;

  inicializarJuegos(Alpine, juegos);

  Alpine.data('avisoConexion', crearAvisoConexion);
  Alpine.data('pagina', (rol) => crearPagina(usuarios, rol));
  Alpine.data('navegacion', (rol) => crearNavegacion(usuarios, rol));
  Alpine.data('login', () => crearLoginController(usuarios));
  Alpine.data('registro', () => crearRegistroController(usuarios));
  Alpine.data('cuenta', (usuarioId) => crearCuentaController(usuarios, usuarioId));
  Alpine.data('usuariosAdmin', () => crearUsuariosAdminController(usuarios));
  Alpine.data('ranking', () => crearRankingController(reportes));
  Alpine.data('resumenGeneral', () => crearResumenGeneralController(reportes));
  Alpine.data('ruleta', (usuarioId) => crearRuletaController(partidas, usuarioId));
  Alpine.data('blackjack', (usuarioId) => crearBlackjackController(partidas, usuarioId));
  Alpine.data('historial', (usuarioId) => crearHistorialController(partidas, usuarioId));
  Alpine.data('partidasAdmin', () => crearPartidasAdminController(partidas));
  Alpine.data('formRuleta', crearFormRuleta);
  Alpine.data('formMonto', crearFormMonto);

  Alpine.magic('creditos', () => formatearCreditos);
  Alpine.magic('fecha', () => formatearFecha);

  componentesRegistrados = true;
}

document.addEventListener('alpine:init', registrarComponentes, { once: true });

const scriptAlpine = document.createElement('script');
scriptAlpine.src =
  '/js/vendor/alpine-3.14.8.min.js';

scriptAlpine.addEventListener('error', () => {
  console.error('No se pudo cargar Alpine.js.');
});

document.head.appendChild(scriptAlpine);

registrarPWA();
