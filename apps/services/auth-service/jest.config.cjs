/**
 * Configuración multi-project:
 *  - unit: lógica aislada (futuro) y mocks.
 *  - security: pruebas de claves/JWT con mocks DB/Redis.
 *  - integration: flujo completo con Postgres real y migraciones.
 */
const path = require('path');
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'js', 'json'],
  transformIgnorePatterns: ['/node_modules/(?!uuid)/'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }
  },
  moduleNameMapper: {
    '^ioredis$': '<rootDir>/../../../packages/shared/src/mocks/ioredis.ts',
    '^@db/(.*)$': '<rootDir>/internal/adapters/db/$1',
    // Resolver alias de TypeScript para el paquete compartido durante tests
    '^@smartedify/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
    '^@smartedify/shared/(.*)$': '<rootDir>/../../../packages/shared/src/$1'
  },
  modulePathIgnorePatterns: ['<rootDir>/tests/__mocks__/ioredis.ts','<rootDir>/tests/__mocks__/pg.ts','<rootDir>/dist']
};

const includeIntegration = process.env.SKIP_DB_TESTS !== '1';
const projects = [
  {
      ...base,
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts']
    },
  {
      ...base,
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/unit/jest.unit.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts']
    },
];

if (includeIntegration) {
  projects.push({
      ...base,
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      globalSetup: '<rootDir>/tests/global-setup.ts',
      globalTeardown: '<rootDir>/tests/global-teardown.ts',
      // setupFiles se ejecuta antes que cualquier import de test -> mock temprano
      setupFiles: ['<rootDir>/tests/integration/jest.integration.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
      // Nota: timeouts y cobertura se gestionan fuera de la config para evitar warnings
    });
}

projects.push({
      ...base,
      displayName: 'contract',
      testMatch: ['<rootDir>/tests/contract/**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/contract/jest.contract.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  // timeouts unificados via jest.setup.ts
});

module.exports = { projects };
