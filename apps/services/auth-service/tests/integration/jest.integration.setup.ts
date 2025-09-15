// Setup específico de la suite 'integration'
// Debe ejecutarse ANTES de importar cualquier módulo que cree instancias de Redis/Pool.
process.env.NODE_ENV = 'test';
// Mock de ioredis para garantizar que la instancia usada en redis.adapter tenga incr/ttl/expire
jest.mock('ioredis');

// (Opcional) Podríamos cargar dotenv manual, pero main.ts ya hace import 'dotenv/config'.
