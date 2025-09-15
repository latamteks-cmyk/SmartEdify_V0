import { hashPassword, verifyPassword } from '../../internal/security/crypto';
import { issueTokenPair, verifyAccess, verifyRefresh, rotateRefresh } from '../../internal/security/jwt';

// Mock liviano de Redis adapter para tokens de refresh
jest.mock('../../internal/adapters/redis/redis.adapter', () => {
  const store = new Map<string,string>();
  return {
    __esModule: true,
    default: {},
    saveRefreshToken: async (k: string, v: any, ttl: number) => { store.set('refresh:'+k, JSON.stringify(v)); },
    getRefreshToken: async (k: string) => { const v = store.get('refresh:'+k); return v? JSON.parse(v): null; },
    revokeRefreshToken: async (k: string) => { store.delete('refresh:'+k); },
    addToRevocationList: async () => {},
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
