import { createAuthPgAdapterMock } from '@smartedify/shared/mocks/auth-pg-adapter';

// Forzar NODE_ENV test
process.env.NODE_ENV = 'test';
// Forzamos modo mock para el User Service durante las suites de Jest
process.env.AUTH_USER_SERVICE_MODE = 'mock';
// Timeout de pruebas unificado (evita usar testTimeout en la config)
// 15s por defecto; tests específicos pueden ajustar con jest.setTimeout local
jest.setTimeout(15000);
// Config por defecto del guard administrativo para pruebas unitarias/contrato
if (!process.env.AUTH_ADMIN_API_KEY || !process.env.AUTH_ADMIN_API_KEY.trim()) {
  process.env.AUTH_ADMIN_API_KEY = 'test-admin-key';
}
if (!process.env.AUTH_ADMIN_API_HEADER || !process.env.AUTH_ADMIN_API_HEADER.trim()) {
  process.env.AUTH_ADMIN_API_HEADER = 'x-admin-api-key';
}

// Silenciar logs por defecto (activar con DEBUG_AUTH=1)
if (process.env.DEBUG_AUTH) {
  process.env.AUTH_TEST_LOGS = '1';
} else {
  delete process.env.AUTH_TEST_LOGS;
}

const authPgMock = createAuthPgAdapterMock(jest);

jest.mock('@db/pg.adapter', () => authPgMock.module);

afterEach(() => {
  authPgMock.reset();
});

// Mock de crypto hashing para acelerar y coordinar con pg.adapter mock
jest.mock('../internal/security/crypto', () => ({
  __esModule: true,
  hashPassword: jest.fn(async (plain) => `mock$${plain}`),
  verifyPassword: jest.fn(async (hash, plain) => {
    if (typeof hash !== 'string' || !hash.startsWith('mock$')) return false;
    return hash.substring(5) === plain;
  })
}));

// Configurar mock de User Service client si existe
try {
  const { setUserServiceClient } = require('../internal/adapters/user-service.client');
  const { createMockUserServiceClient } = require('../internal/adapters/user-service.mock');
  setUserServiceClient(createMockUserServiceClient());
} catch (err) {
  if (process.env.AUTH_TEST_LOGS) {
    console.warn('[jest.setup] No se pudo configurar mock de User Service', err);
  }
}

// Nota: el mock de ioredis se resuelve vía moduleNameMapper a @smartedify/shared/mocks/ioredis
// No es necesario declarar jest.mock('ioredis', ... ) aquí.
