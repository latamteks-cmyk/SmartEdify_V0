// Mock extendido de ioredis para entorno de test.
// Soporta set, get, del, incr, expire, ttl, ping, quit, flushdb.
// Implementado en memoria con expiraciones basadas en timestamps.

type Stored = { value: string; expiresAt?: number };

// Stores compartidos (una sola memoria entre múltiples instancias)
const sharedStore: Map<string, Stored> = (global as any).__REDIS_MOCK_STORE__ || new Map();
(global as any).__REDIS_MOCK_STORE__ = sharedStore;

class MockRedis {
  private store = sharedStore;

  constructor(_opts?: any) {}

  private isExpired(entry?: Stored) {
    return !!(entry && entry.expiresAt && entry.expiresAt < Date.now());
  }

  async set(key: string, value: string, mode?: string, ttl?: number) {
    const entry: Stored = { value };
    if (mode === 'EX' && typeof ttl === 'number') {
      entry.expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, entry);
    return 'OK';
  }
  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) { this.store.delete(key); return null; }
    return entry.value;
  }
  async del(key: string) {
    this.store.delete(key);
    return 1;
  }
  // Incrementa valor numérico (interpreta falta como 0)
  async incr(key: string) {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      const newEntry: Stored = { value: '1', expiresAt: entry?.expiresAt };
      this.store.set(key, newEntry);
      return 1;
    }
    const num = parseInt(entry.value, 10) || 0;
    const next = num + 1;
    entry.value = String(next);
    return next;
  }
  async expire(key: string, ttlSeconds: number) {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return 1;
  }
  async ttl(key: string) {
    const entry = this.store.get(key);
    if (!entry) return -2; // clave no existe
    if (!entry.expiresAt) return -1; // sin expiración
    const msLeft = entry.expiresAt - Date.now();
    if (msLeft <= 0) { this.store.delete(key); return -2; }
    return Math.ceil(msLeft / 1000);
  }
  async ping() { return 'PONG'; }
  async flushdb() { this.store.clear(); }
  async quit() { this.store.clear(); }
}

// Compatibilidad CommonJS + ESModule: si Jest transpila a CJS, default debe ser la clase.
// Devolvemos tanto module.exports como module.exports.default y export default.
// Esto evita el error "is not a constructor" cuando ts-jest envuelve en { default: exported }.
(module as any).exports = MockRedis;
(module as any).exports.default = MockRedis;
export default MockRedis;