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
  moduleNameMapper: {
    '^ioredis$': '<rootDir>/__mocks__/ioredis.ts'
  },
  modulePathIgnorePatterns: ['<rootDir>/tests/__mocks__/ioredis.ts','<rootDir>/tests/__mocks__/pg.ts']
};

module.exports = {
  projects: [
    {
      ...base,
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.test.ts'],
      testTimeout: 15000,
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts']
    },
    {
      ...base,
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testTimeout: 15000,
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts']
    },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      globalSetup: '<rootDir>/tests/global-setup.ts',
      globalTeardown: '<rootDir>/tests/global-teardown.ts',
      // setupFiles se ejecuta antes que cualquier import de test -> mock temprano
      setupFiles: ['<rootDir>/tests/integration/jest.integration.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
      testTimeout: 20000,
      collectCoverage: true,
      coverageDirectory: '<rootDir>/coverage/integration',
      coverageProvider: 'v8',
      coverageReporters: ['text-summary', 'lcov'],
      collectCoverageFrom: [
        '<rootDir>/internal/adapters/http/**/*.ts',
        '<rootDir>/internal/security/**/*.ts',
        '<rootDir>/cmd/server/**/*.ts'
      ],
      coveragePathIgnorePatterns: ['<rootDir>/internal/adapters/http/openapi.*', '<rootDir>/internal/adapters/http/__mocks__'],
      coverageThreshold: {
        global: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        }
      }
    },
    {
      ...base,
      displayName: 'contract',
      testMatch: ['<rootDir>/tests/contract/**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/contract/jest.contract.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
      testTimeout: 20000
    }
  ]
};
