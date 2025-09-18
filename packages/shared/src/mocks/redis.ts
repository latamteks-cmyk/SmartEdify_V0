export interface RedisCommandCall {
  readonly command: string;
  readonly args: readonly unknown[];
}

export interface RedisMock {
  readonly get: (key: string) => Promise<string | null>;
  readonly set: (key: string, value: string, ttlSeconds?: number) => Promise<'OK'>;
  readonly del: (...keys: string[]) => Promise<number>;
  readonly flushAll: () => Promise<'OK'>;
  readonly getCalls: () => readonly RedisCommandCall[];
  readonly reset: () => void;
}

interface StoredEntry {
  readonly value: string;
  readonly expiresAt?: number;
}

export function createRedisMock(): RedisMock {
  const store = new Map<string, StoredEntry>();
  const calls: RedisCommandCall[] = [];

  const track = (command: string, args: readonly unknown[]) => {
    calls.push({ command, args });
  };

  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        store.delete(key);
      }
    }
  };

  const get = async (key: string) => {
    cleanup();
    track('get', [key]);
    const entry = store.get(key);
    return entry ? entry.value : null;
  };

  const set = async (key: string, value: string, ttlSeconds?: number) => {
    cleanup();
    track('set', [key, value, ttlSeconds]);
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    store.set(key, { value, expiresAt });
    return 'OK' as const;
  };

  const del = async (...keys: string[]) => {
    cleanup();
    track('del', keys);
    let removed = 0;
    for (const key of keys) {
      if (store.delete(key)) {
        removed += 1;
      }
    }
    return removed;
  };

  const flushAll = async () => {
    track('flushall', []);
    store.clear();
    return 'OK' as const;
  };

  const getCalls = () => calls.slice();

  const reset = () => {
    store.clear();
    calls.splice(0, calls.length);
  };

  return {
    get,
    set,
    del,
    flushAll,
    getCalls,
    reset
  };
}
