// Configuración Jest para Node ESM/CommonJS compatible
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@db/(.*)$': '<rootDir>/internal/adapters/db/$1'
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
};
