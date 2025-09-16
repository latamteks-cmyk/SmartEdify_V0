// Forzar el mock del alias unificado @db/pg.adapter antes de cualquier import de producción
jest.mock('@db/pg.adapter', () => require('../__mocks__/pg.adapter.ts'));
// Desactivar logs verbosos por defecto; permitir activarlos con DEBUG_AUTH=1
if (process.env.DEBUG_AUTH) {
  process.env.AUTH_TEST_LOGS = '1';
} else {
  delete process.env.AUTH_TEST_LOGS;
}
// Mock de crypto hashing para acelerar y coordinar con pg.adapter mock
jest.mock('../internal/security/crypto', () => ({
  hashPassword: jest.fn(async (plain: string) => `mock$${plain}`),
  verifyPassword: jest.fn(async (hash: string, plain: string) => {
    if (!hash.startsWith('mock$')) return false;
    return hash.substring(5) === plain;
  })
}));
// Forzar mock de validación de usuario para que siempre permita registro en tests
jest.mock('../internal/adapters/user-service.mock', () => ({
  mockValidateUser: jest.fn().mockResolvedValue(true)
}));

// Acceso opcional a los mocks para ajustes por test si se requiere
// (Ya no necesitamos seedSigningKey: el mock genera una clave RSA real si falta)
// Mock global de ioredis para Jest (ESM compatible)
type Stored = { value: string; expiresAt?: number };
class MockRedis {
  private store: Map<string, Stored> = new Map();
  constructor(_opts?: unknown) {}
  async set(key: string, value: string, mode?: string, ttl?: number): Promise<string> {
    const entry: Stored = { value };
    if (mode === 'EX' && typeof ttl === 'number') {
      entry.expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, entry);
    return 'OK';
  }
  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) { this.store.delete(key); return null; }
    return entry.value;
  }
  async del(key: string): Promise<number> { this.store.delete(key); return 1; }
  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || (entry.expiresAt && entry.expiresAt < Date.now())) {
      const newEntry: Stored = { value: '1', expiresAt: entry?.expiresAt };
      this.store.set(key, newEntry);
      return 1;
    }
    const num = parseInt(entry.value, 10) || 0;
    const next = num + 1;
    entry.value = String(next);
    return next;
  }
  async expire(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return 1;
  }
  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const msLeft = entry.expiresAt - Date.now();
    if (msLeft <= 0) { this.store.delete(key); return -2; }
    return Math.ceil(msLeft / 1000);
  }
  async ping(): Promise<string> { return 'PONG'; }
  async flushdb(): Promise<void> { this.store.clear(); }
  async quit(): Promise<void> { this.store.clear(); }
}

// ESM compatible: export default
export default MockRedis;

// Jest global mock
if (typeof jest !== 'undefined') {
  jest.mock('ioredis', () => ({ __esModule: true, default: MockRedis }));
}
