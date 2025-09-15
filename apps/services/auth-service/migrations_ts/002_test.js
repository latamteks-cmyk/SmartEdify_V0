module.exports = {
  up: async (pgm) => {
    console.log('Migración de prueba ejecutada');
  },
  down: async (pgm) => {
    console.log('Rollback de prueba ejecutado');
  }
};
