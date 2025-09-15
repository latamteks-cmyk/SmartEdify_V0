import Redis from 'ioredis';

// En entorno de test Jest usará el mock (__mocks__/ioredis.ts). No abrirá conexión real.
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

// Tip: el mock en __mocks__/ioredis.ts ya implementa incr/expire/ttl.
// Para robustez tipada (aunque no usamos types estricto aquí) agregamos wrappers opcionales
// que delegan a la instancia real/mocked.
export async function incr(key: string) {
  return (redis as any).incr(key);
}
export async function expire(key: string, ttlSeconds: number) {
  return (redis as any).expire(key, ttlSeconds);
}
export async function ttl(key: string) {
  return (redis as any).ttl(key);
}

// Sesiones
export async function saveSession(sessionId: string, data: any, ttl: number = 3600) {
  await redis.set(`session:${sessionId}`, JSON.stringify(data), 'EX', ttl);
}
export async function getSession(sessionId: string) {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}
export async function deleteSession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}

// Refresh tokens (in-memory fallback en test para evitar múltiples stores separados del mock)
const inMemoryRefreshStore: Map<string, { value: any; expiresAt: number }> = (global as any).__REFRESH_STORE__ || new Map();
(global as any).__REFRESH_STORE__ = inMemoryRefreshStore;

export async function saveRefreshToken(tokenId: string, data: any, ttl: number = 2592000) {
  if (isTestEnv) {
    inMemoryRefreshStore.set(tokenId, { value: data, expiresAt: Date.now() + ttl * 1000 });
    return;
  }
  await redis.set(`refresh:${tokenId}`, JSON.stringify(data), 'EX', ttl);
}
export async function getRefreshToken(tokenId: string) {
  if (isTestEnv) {
    const entry = inMemoryRefreshStore.get(tokenId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { inMemoryRefreshStore.delete(tokenId); return null; }
    return entry.value;
  }
  const data = await redis.get(`refresh:${tokenId}`);
  return data ? JSON.parse(data) : null;
}
export async function revokeRefreshToken(tokenId: string) {
  if (isTestEnv) {
    inMemoryRefreshStore.delete(tokenId);
    return;
  }
  await redis.del(`refresh:${tokenId}`);
}

// Rotated refresh detection distribuida (solo activa fuera de test)
export async function markRefreshRotated(jti: string, ttlSeconds: number = 3600) {
  if (isTestEnv) return; // en test usamos in-memory set
  await redis.set(`rotated:${jti}`, '1', 'EX', ttlSeconds);
}
export async function isRefreshRotated(jti: string) {
  if (isTestEnv) return false;
  return !!(await redis.get(`rotated:${jti}`));
}

// Lista de revocación
export async function addToRevocationList(jti: string, type: 'access' | 'refresh', reason: string, expires: number) {
  await redis.set(`revoked:${jti}`, JSON.stringify({ type, reason }), 'EX', expires);
}
export async function isRevoked(jti: string) {
  return !!(await redis.get(`revoked:${jti}`));
}

// Password reset tokens (namespace separado)
// In-memory fallback para tests (evita problemas de mocking multi-instancia)
const isTestEnv = process.env.NODE_ENV === 'test';
const inMemoryResetStore: Map<string, { value: any; expiresAt: number }> = (global as any).__PWDRESET_STORE__ || new Map();
(global as any).__PWDRESET_STORE__ = inMemoryResetStore;

export async function savePasswordResetToken(token: string, data: any, ttl: number = 3600) {
  if (isTestEnv) {
    inMemoryResetStore.set(token, { value: data, expiresAt: Date.now() + ttl * 1000 });
    return;
  }
  await redis.set(`pwdreset:${token}`, JSON.stringify(data), 'EX', ttl);
}
export async function getPasswordResetToken(token: string) {
  if (isTestEnv) {
    const entry = inMemoryResetStore.get(token);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { inMemoryResetStore.delete(token); return null; }
    return entry.value;
  }
  const data = await redis.get(`pwdreset:${token}`);
  return data ? JSON.parse(data) : null;
}
export async function consumePasswordResetToken(token: string) {
  if (isTestEnv) {
    const entry = await getPasswordResetToken(token);
    inMemoryResetStore.delete(token);
    return entry;
  }
  const d = await getPasswordResetToken(token);
  await redis.del(`pwdreset:${token}`);
  return d;
}

export async function redisPing() {
  return redis.ping();
}

export default redis;
