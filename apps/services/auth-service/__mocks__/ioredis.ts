// Mock extendido de ioredis para entorno de test.
// Soporta set, get, del, incr, expire, ttl, ping, quit, flushdb.
// Implementado en memoria con expiraciones basadas en timestamps.

type Stored = { value: string; expiresAt?: number };

// Stores compartidos (una sola memoria entre múltiples instancias)
type GlobalWithRedisMockStore = typeof globalThis & { __REDIS_MOCK_STORE__?: Map<string, Stored> };
const globalWithStore = global as GlobalWithRedisMockStore;
const sharedStore: Map<string, Stored> = globalWithStore.__REDIS_MOCK_STORE__ || new Map();
globalWithStore.__REDIS_MOCK_STORE__ = sharedStore;

class MockRedis {
  private store = sharedStore;

  constructor(_opts?: unknown) {}

  private isExpired(entry?: Stored) {
    return !!(entry && entry.expiresAt && entry.expiresAt < Date.now());
  }

  private readSet(entry: Stored | undefined): Set<string> {
    if (!entry) return new Set();
    if (!entry.value.startsWith('__SET__:')) return new Set();
    try {
      const parsed = JSON.parse(entry.value.substring(8));
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    } catch {}
    return new Set();
  }

  private writeSet(entry: Stored | undefined, set: Set<string>): Stored {
    const expiresAt = entry?.expiresAt;
    return { value: '__SET__:' + JSON.stringify(Array.from(set)), expiresAt };
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
  async sadd(key: string, ...members: string[]) {
    const entry = this.store.get(key);
    const set = this.readSet(entry);
    let added = 0;
    for (const member of members) {
      const str = String(member);
      if (!set.has(str)) {
        set.add(str);
        added += 1;
      }
    }
    const stored: Stored = this.writeSet(entry, set);
    this.store.set(key, stored);
    return added;
  }
  async smembers(key: string) {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return [];
    }
    return Array.from(this.readSet(entry));
  }
  async srem(key: string, ...members: string[]) {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return 0;
    }
    const set = this.readSet(entry);
    let removed = 0;
    for (const member of members) {
      if (set.delete(String(member))) removed += 1;
    }
    const stored = this.writeSet(entry, set);
    if (set.size === 0) {
      this.store.delete(key);
      return removed;
    }
    this.store.set(key, stored);
    return removed;
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

// Exportación compatible ESM/CommonJS para Jest
// Para que `import Redis from 'ioredis'` reciba un objeto con .default
// y `require('ioredis')` reciba la clase directamente
// @ts-ignore
if (typeof module !== 'undefined') {
  // @ts-ignore
  module.exports = { default: MockRedis };
}