// Contrato de acceso a datos: define QUÉ se puede hacer, nunca CÓMO.
// Todos los métodos son async para poder cambiar localStorage por una API
// sin obligar a modificar los servicios que consumen este repositorio.

export class Repository {
  async listar(coleccion) {
    throw new Error('No implementado');
  }

  async crear(coleccion, item) {
    throw new Error('No implementado');
  }

  async editar(coleccion, item) {
    throw new Error('No implementado');
  }

  async eliminar(coleccion, id) {
    throw new Error('No implementado');
  }
}
