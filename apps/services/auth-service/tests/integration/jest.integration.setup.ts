// Setup específico de la suite 'integration'
// Debe ejecutarse ANTES de importar cualquier módulo que cree instancias de Redis/Pool.
process.env.NODE_ENV = 'test';

// Timeout de pruebas para tests de integración (mayor que unit tests)
jest.setTimeout(30000);

// Configuración por defecto del guard administrativo para pruebas de integración
if (!process.env.AUTH_ADMIN_API_KEY) {
  process.env.AUTH_ADMIN_API_KEY = 'integration-admin-secret';
}
if (!process.env.AUTH_ADMIN_API_HEADER) {
  process.env.AUTH_ADMIN_API_HEADER = 'x-admin-api-key';
}
if (!process.env.AUTH_ADMIN_RATE_LIMIT_MAX) {
  process.env.AUTH_ADMIN_RATE_LIMIT_MAX = '1';
}
if (!process.env.AUTH_ADMIN_RATE_LIMIT_WINDOW_MS) {
  process.env.AUTH_ADMIN_RATE_LIMIT_WINDOW_MS = '60000';
}

// Defaults básicos para integración
process.env.PORT = process.env.PORT || '0';
process.env.AUTH_PORT = process.env.AUTH_PORT || '0';
process.env.PGHOST = process.env.PGHOST || 'localhost';
process.env.PGPORT = process.env.PGPORT || '5432';
process.env.PGUSER = process.env.PGUSER || 'postgres';
process.env.PGPASSWORD = process.env.PGPASSWORD || 'postgres';
process.env.PGDATABASE = process.env.PGDATABASE || 'smartedify_test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

// Configuración del User Service en modo mock para integración
process.env.AUTH_USER_SERVICE_MODE = 'mock';

// Mock de ioredis para garantizar que la instancia usada en redis.adapter tenga incr/ttl/expire
jest.mock('ioredis');

// (Opcional) Podríamos cargar dotenv manual, pero main.ts ya hace import 'dotenv/config'.
