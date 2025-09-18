// Setup específico de la suite 'integration'
// Debe ejecutarse ANTES de importar cualquier módulo que cree instancias de Redis/Pool.
process.env.NODE_ENV = 'test';
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
// Mock de ioredis para garantizar que la instancia usada en redis.adapter tenga incr/ttl/expire
jest.mock('ioredis');

// (Opcional) Podríamos cargar dotenv manual, pero main.ts ya hace import 'dotenv/config'.
