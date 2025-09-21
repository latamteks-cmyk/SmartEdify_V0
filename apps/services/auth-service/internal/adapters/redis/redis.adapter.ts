
import Redis from 'ioredis';

// En entorno de test Jest usará el mock de @smartedify/shared/mocks/ioredis. No abrirá conexión real.
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

const isTestEnv = process.env.NODE_ENV === 'test';

const inMemoryAccessDeny: Map<string, { reason: string; expiresAt: number | null }> = (global as any).__ACCESS_DENY__ || new Map();
(global as any).__ACCESS_DENY__ = inMemoryAccessDeny;

// Tip: el mock compartido implementa incr/expire/ttl.
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

const inMemoryKidIndex: Map<string, { tokens: Set<string>; expiresAt: number | null }> = (global as any).__REFRESH_KID_INDEX__ || new Map();
(global as any).__REFRESH_KID_INDEX__ = inMemoryKidIndex;

const inMemoryRevokedKids: Map<string, number | null> = (global as any).__REVOKED_KIDS__ || new Map();
(global as any).__REVOKED_KIDS__ = inMemoryRevokedKids;

function cleanupKidIndex(targetKid?: string) {
  const now = Date.now();
  const keys = typeof targetKid === 'string' ? [targetKid] : Array.from(inMemoryKidIndex.keys());
  for (const kid of keys) {
    const entry = inMemoryKidIndex.get(kid);
    if (!entry) continue;
    if (entry.expiresAt && entry.expiresAt < now) {
      inMemoryKidIndex.delete(kid);
      continue;
    }
    for (const tokenId of Array.from(entry.tokens)) {
      const stored = inMemoryRefreshStore.get(tokenId);
      if (!stored || stored.expiresAt < now) {
        entry.tokens.delete(tokenId);
      }
    }
    if (entry.tokens.size === 0) {
      inMemoryKidIndex.delete(kid);
    }
  }
}

export async function saveRefreshToken(tokenId: string, data: any, ttl: number = 2592000) {
  if (isTestEnv) {
    inMemoryRefreshStore.set(tokenId, { value: data, expiresAt: Date.now() + ttl * 1000 });
    if (typeof data?.kid === 'string') {
      const entry = inMemoryKidIndex.get(data.kid) || { tokens: new Set<string>(), expiresAt: null };
      entry.tokens.add(tokenId);
      entry.expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
      inMemoryKidIndex.set(data.kid, entry);
    }
    return;
  }
  await redis.set(`refresh:${tokenId}`, JSON.stringify(data), 'EX', ttl);
  if (typeof data?.kid === 'string') {
    await (redis as any).sadd(`kid:${data.kid}`, tokenId);
    if (ttl > 0) await (redis as any).expire(`kid:${data.kid}`, ttl);
  }
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
    const entry = inMemoryRefreshStore.get(tokenId);
    inMemoryRefreshStore.delete(tokenId);
    const kid = entry?.value?.kid;
    if (typeof kid === 'string') {
      cleanupKidIndex(kid);
      const kidEntry = inMemoryKidIndex.get(kid);
      if (kidEntry) {
        kidEntry.tokens.delete(tokenId);
        if (kidEntry.tokens.size === 0) inMemoryKidIndex.delete(kid);
      }
    }
    return;
  }
  let stored: any = null;
  try {
    const raw = await redis.get(`refresh:${tokenId}`);
    stored = raw ? JSON.parse(raw) : null;
  } catch {}
  await redis.del(`refresh:${tokenId}`);
  if (stored?.kid) {
    await (redis as any).srem(`kid:${stored.kid}`, tokenId);
  }
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

export async function addAccessTokenToDenyList(jti: string, reason: string, expires: number) {
  if (!jti) return;
  if (isTestEnv) {
    inMemoryAccessDeny.set(jti, { reason, expiresAt: expires > 0 ? Date.now() + expires * 1000 : null });
    return;
  }
  await redis.set(`deny:access:${jti}`, JSON.stringify({ reason }), 'EX', expires);
}

export async function isAccessTokenDenied(jti: string) {
  if (!jti) return false;
  if (isTestEnv) {
    const entry = inMemoryAccessDeny.get(jti);
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      inMemoryAccessDeny.delete(jti);
      return false;
    }
    return true;
  }
  return !!(await redis.get(`deny:access:${jti}`));
}

export async function markKidRevoked(kid: string, expires: number) {
  if (!kid) return;
  if (isTestEnv) {
    inMemoryRevokedKids.set(kid, expires > 0 ? Date.now() + expires * 1000 : null);
    return;
  }
  await redis.set(`revokedkid:${kid}`, '1', 'EX', expires);
}

export async function isKidRevoked(kid: string) {
  if (!kid) return false;
  if (isTestEnv) {
    const entry = inMemoryRevokedKids.get(kid);
    if (!entry) return false;
    if (entry && entry > 0 && entry < Date.now()) {
      inMemoryRevokedKids.delete(kid);
      return false;
    }
    return true;
  }
  return !!(await redis.get(`revokedkid:${kid}`));
}

export async function trackRefreshKid(kid: string | null | undefined, tokenId: string, ttlSeconds: number) {
  if (!kid || !tokenId) return;
  if (isTestEnv) {
    cleanupKidIndex();
    const entry = inMemoryKidIndex.get(kid) || { tokens: new Set<string>(), expiresAt: null };
    entry.tokens.add(tokenId);
    entry.expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    inMemoryKidIndex.set(kid, entry);
    return;
  }
  await (redis as any).sadd(`kid:${kid}`, tokenId);
  if (ttlSeconds > 0) await (redis as any).expire(`kid:${kid}`, ttlSeconds);
}

export async function untrackRefreshKid(kid: string | null | undefined, tokenId: string) {
  if (!kid || !tokenId) return;
  if (isTestEnv) {
    cleanupKidIndex(kid);
    const entry = inMemoryKidIndex.get(kid);
    if (!entry) return;
    entry.tokens.delete(tokenId);
    if (entry.tokens.size === 0) inMemoryKidIndex.delete(kid);
    return;
  }
  await (redis as any).srem(`kid:${kid}`, tokenId);
}

export async function getRefreshTokensByKid(kid: string | null | undefined): Promise<string[]> {
  if (!kid) return [];
  if (isTestEnv) {
    cleanupKidIndex(kid);
    const entry = inMemoryKidIndex.get(kid);
    return entry ? Array.from(entry.tokens) : [];
  }
  const members = await (redis as any).smembers(`kid:${kid}`);
  if (!Array.isArray(members)) return [];
  return members;
}

export async function getRefreshTokenTtl(tokenId: string): Promise<number> {
  if (isTestEnv) {
    const entry = inMemoryRefreshStore.get(tokenId);
    if (!entry) return -2;
    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) return -2;
    return Math.ceil(remainingMs / 1000);
  }
  return (redis as any).ttl(`refresh:${tokenId}`);
}

// Authorization codes (PKCE)
const inMemoryAuthCodeStore: Map<string, { value: any; expiresAt: number }> = (global as any).__AUTH_CODE_STORE__ || new Map();
(global as any).__AUTH_CODE_STORE__ = inMemoryAuthCodeStore;

export async function saveAuthorizationCode(code: string, data: any, ttl: number = 600) {
  if (isTestEnv) {
    inMemoryAuthCodeStore.set(code, { value: data, expiresAt: Date.now() + ttl * 1000 });
    return;
  }
  await redis.set(`authcode:${code}`, JSON.stringify(data), 'EX', ttl);
}

export async function getAuthorizationCode(code: string) {
  if (isTestEnv) {
    const entry = inMemoryAuthCodeStore.get(code);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      inMemoryAuthCodeStore.delete(code);
      return null;
    }
    return entry.value;
  }
  const data = await redis.get(`authcode:${code}`);
  return data ? JSON.parse(data) : null;
}

export async function consumeAuthorizationCode(code: string) {
  if (isTestEnv) {
    const entry = await getAuthorizationCode(code);
    inMemoryAuthCodeStore.delete(code);
    return entry;
  }
  const data = await getAuthorizationCode(code);
  await redis.del(`authcode:${code}`);
  return data;
}

// Password reset tokens (namespace separado)
// In-memory fallback para tests (evita problemas de mocking multi-instancia)
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

export async function revokeAllUserSessions(userId: string): Promise<void> {
    if (isTestEnv) {
        const now = Date.now();
        for (const [tokenId, entry] of inMemoryRefreshStore.entries()) {
            if (entry.value.sub === userId) {
                inMemoryRefreshStore.delete(tokenId);
            }
        }
        return;
    }

    const stream = redis.scanStream({
        match: 'refresh:*',
        count: 100,
    });

    const tokensToDelete: string[] = [];

    for await (const keys of stream) {
        for (const key of keys) {
            const rawToken = await redis.get(key);
            if (rawToken) {
                try {
                    const tokenData = JSON.parse(rawToken);
                    if (tokenData.sub === userId) {
                        tokensToDelete.push(key);
                    }
                } catch (error) {
                    console.error(`Error parsing token data for key ${key}:`, error);
                }
            }
        }
    }

    if (tokensToDelete.length > 0) {
        await redis.del(...tokensToDelete);
    }
}

// Test utility function to clear all stores
export async function clearAllStores() {
    if (isTestEnv) {
        // Clear in-memory stores
        inMemoryAccessDeny.clear();
        
        // Clear Redis stores (safely handle mocked Redis)
        try {
            if (redis && typeof redis.keys === 'function') {
                const keys = await redis.keys('*');
                if (keys && keys.length > 0) {
                    await redis.del(...keys);
                }
            } else if (redis && typeof redis.flushall === 'function') {
                // Alternative approach if keys() is not available
                await redis.flushall();
            }
            // If neither method is available, just continue (Redis is likely fully mocked)
        } catch (error) {
            // In test environment, Redis operations might be mocked and could throw
            console.log('[clearAllStores] Redis clear skipped (likely mocked):', error instanceof Error ? error.message : error);
        }
        
        console.log('[clearAllStores] All test stores cleared');
    } else {
        console.warn('[clearAllStores] Not in test environment - operation skipped');
    }
}
