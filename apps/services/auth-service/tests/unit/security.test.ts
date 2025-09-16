import { hashPassword, verifyPassword } from '../../internal/security/crypto';
import { issueTokenPair, verifyAccess, verifyRefresh, rotateRefresh } from '../../internal/security/jwt';

// Mock liviano de Redis adapter para tokens de refresh
jest.mock('../../internal/adapters/redis/redis.adapter', () => {
  const refresh = new Map<string,string>();
  const revoked = new Set<string>();
  const rotated = new Set<string>();
  return {
    __esModule: true,
    default: {},
    saveRefreshToken: async (k: string, v: any) => { refresh.set('refresh:'+k, JSON.stringify(v)); },
    getRefreshToken: async (k: string) => { const v = refresh.get('refresh:'+k); return v? JSON.parse(v): null; },
    revokeRefreshToken: async (k: string) => { refresh.delete('refresh:'+k); revoked.add(k); },
    addToRevocationList: async (jti: string) => { revoked.add(jti); },
    isRevoked: async (jti: string) => revoked.has(jti),
    markRefreshRotated: async (jti: string) => { rotated.add(jti); },
    isRefreshRotated: async (jti: string) => rotated.has(jti),
  };
});

describe('Security primitives', () => {
  it('hashes and verifies password', async () => {
    const pw = 'SuperSecret123!';
    const hash = await hashPassword(pw);
  expect(hash).toMatch(/^mock\$/);
    const ok = await verifyPassword(hash, pw);
    expect(ok).toBe(true);
    const fail = await verifyPassword(hash, 'wrong');
    expect(fail).toBe(false);
  });

  it('issues and verifies access + refresh tokens then rotates', async () => {
    const pair = await issueTokenPair({ sub: 'user-1', tenant_id: 'default', roles: ['user'] });
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
  const acc: any = await verifyAccess(pair.accessToken);
  expect(acc.sub).toBe('user-1');
  const ref: any = await verifyRefresh(pair.refreshToken);
  expect(ref.sub).toBe('user-1');

    const rotated = await rotateRefresh(pair.refreshToken);
    expect(rotated).not.toBeNull();
    if (rotated) {
      expect(rotated.refreshToken).not.toEqual(pair.refreshToken);
    }
  });
});
