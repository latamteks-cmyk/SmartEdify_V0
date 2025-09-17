import { hashPassword, verifyPassword } from '../../internal/security/crypto';
import { issueTokenPair, verifyAccess, verifyRefresh, rotateRefresh } from '../../internal/security/jwt';

// Mock liviano de Redis adapter para tokens de refresh
jest.mock('../../internal/adapters/redis/redis.adapter', () => {
  const refresh = new Map<string, { data: any; expiresAt: number }>();
  const revocations = new Set<string>();
  const deny = new Set<string>();
  const kidIndex = new Map<string, Set<string>>();
  const revokedKids = new Set<string>();
  return {
    __esModule: true,
    default: {},
    saveRefreshToken: async (k: string, v: any, ttl: number) => {
      refresh.set(k, { data: v, expiresAt: Date.now() + ttl * 1000 });
      if (v?.kid) {
        const set = kidIndex.get(v.kid) || new Set<string>();
        set.add(k);
        kidIndex.set(v.kid, set);
      }
    },
    getRefreshToken: async (k: string) => {
      const entry = refresh.get(k);
      return entry ? entry.data : null;
    },
    revokeRefreshToken: async (k: string) => {
      const entry = refresh.get(k);
      refresh.delete(k);
      const kid = entry?.data?.kid;
      if (kid && kidIndex.has(kid)) {
        const set = kidIndex.get(kid)!;
        set.delete(k);
        if (set.size === 0) kidIndex.delete(kid);
      }
    },
    addToRevocationList: async (jti: string) => { revocations.add(jti); },
    isRevoked: async (jti: string) => revocations.has(jti),
    markRefreshRotated: async () => {},
    isRefreshRotated: async () => false,
    addAccessTokenToDenyList: async (jti: string) => { deny.add(jti); },
    isAccessTokenDenied: async (jti: string) => deny.has(jti),
    markKidRevoked: async (kid: string) => { revokedKids.add(kid); },
    isKidRevoked: async (kid: string) => revokedKids.has(kid),
    getRefreshTokensByKid: async (kid: string) => Array.from(kidIndex.get(kid) || []),
    getRefreshTokenTtl: async () => 60,
    deleteSession: async () => {},
  };
});

describe('Security primitives', () => {
  it('hashes and verifies password', async () => {
    const pw = 'SuperSecret123!';
    const hash = await hashPassword(pw);
    expect(hash).toMatch(/argon2id/);
    const ok = await verifyPassword(hash, pw);
    expect(ok).toBe(true);
    const fail = await verifyPassword(hash, 'wrong');
    expect(fail).toBe(false);
  });

  it('issues and verifies access + refresh tokens then rotates', async () => {
    const pair = await issueTokenPair({ sub: 'user-1', tenant_id: 'default', roles: ['user'] });
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    const acc = verifyAccess(pair.accessToken) as any;
    expect(acc.sub).toBe('user-1');
    const ref = verifyRefresh(pair.refreshToken) as any;
    expect(ref.sub).toBe('user-1');

    const rotated = await rotateRefresh(pair.refreshToken);
    expect(rotated).not.toBeNull();
    if (rotated) {
      expect(rotated.refreshToken).not.toEqual(pair.refreshToken);
    }
  });
});
