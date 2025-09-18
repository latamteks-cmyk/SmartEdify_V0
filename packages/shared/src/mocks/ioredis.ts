/*
 * In-memory replacement for `ioredis` used in tests. It implements the subset
 * of commands exercised by the services (string operations, counters and set
 * membership) while keeping behaviour deterministic across test suites. The
 * implementation mirrors the previous service-local mock so existing tests
 * continue to operate without modifications.
 */

type StoredEntry = {
  value: string;
  expiresAt?: number;
};

interface GlobalWithRedisStore extends typeof globalThis {
  __SMARTEDIFY_REDIS_STORE__?: Map<string, StoredEntry>;
}

const globalWithStore = globalThis as GlobalWithRedisStore;
const sharedStore: Map<string, StoredEntry> =
  globalWithStore.__SMARTEDIFY_REDIS_STORE__ || new Map();
globalWithStore.__SMARTEDIFY_REDIS_STORE__ = sharedStore;

export class InMemoryRedis {
  private readonly store = sharedStore;

  constructor(_opts?: unknown) {}

  private isExpired(entry?: StoredEntry) {
    return Boolean(entry?.expiresAt && entry.expiresAt < Date.now());
  }

  private readSet(entry: StoredEntry | undefined): Set<string> {
    if (!entry) return new Set();
    if (!entry.value.startsWith('__SET__:')) return new Set();
    try {
      const parsed = JSON.parse(entry.value.substring(8));
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    } catch (error) {
      if (process.env.AUTH_TEST_LOGS) {
        // eslint-disable-next-line no-console
        console.warn('[redis-mock] failed to parse set payload', error);
      }
    }
    return new Set();
  }

  private writeSet(entry: StoredEntry | undefined, set: Set<string>): StoredEntry {
    const expiresAt = entry?.expiresAt;
    return { value: '__SET__:' + JSON.stringify(Array.from(set)), expiresAt };
  }

  async set(key: string, value: string, mode?: string, ttl?: number) {
    const entry: StoredEntry = { value };
    if (mode === 'EX' && typeof ttl === 'number') {
      entry.expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, entry);
    return 'OK';
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(...keys: string[]) {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed += 1;
    }
    return removed;
  }

  async incr(key: string) {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      const newEntry: StoredEntry = { value: '1', expiresAt: entry?.expiresAt };
      this.store.set(key, newEntry);
      return 1;
    }
    const current = parseInt(entry.value, 10) || 0;
    const next = current + 1;
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
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const msLeft = entry.expiresAt - Date.now();
    if (msLeft <= 0) {
      this.store.delete(key);
      return -2;
    }
    return Math.ceil(msLeft / 1000);
  }

  async sadd(key: string, ...members: string[]) {
    const entry = this.store.get(key);
    const set = this.readSet(entry);
    let added = 0;
    for (const member of members) {
      const candidate = String(member);
      if (!set.has(candidate)) {
        set.add(candidate);
        added += 1;
      }
    }
    const stored = this.writeSet(entry, set);
    this.store.set(key, stored);
    return added;
  }

  async smembers(key: string) {
    const entry = this.store.get(key);
    if (!entry) return [];
    if (this.isExpired(entry)) {
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
    if (set.size === 0) {
      this.store.delete(key);
      return removed;
    }
    const stored = this.writeSet(entry, set);
    this.store.set(key, stored);
    return removed;
  }

  async ping() {
    return 'PONG';
  }

  async flushdb() {
    this.store.clear();
  }

  async flushall() {
    this.store.clear();
    return 'OK' as const;
  }

  async quit() {
    return;
  }
}

export default InMemoryRedis;
