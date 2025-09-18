jest.mock('ioredis');
// Eliminado mock inline de pg.adapter para usar el mock global
const originalAccessTtl = process.env.AUTH_JWT_ACCESS_TTL;
const originalRefreshTtl = process.env.AUTH_JWT_REFRESH_TTL;
process.env.AUTH_JWT_ACCESS_TTL = '5s';
process.env.AUTH_JWT_REFRESH_TTL = '10s';
import { issueTokenPair, verifyAccess, verifyRefresh, rotateRefresh, revokeSessionsByKid } from '../../internal/security/jwt';
import { addAccessTokenToDenyList } from '../../internal/adapters/redis/redis.adapter';
import { getCurrentKey } from '../../internal/security/keys';

const ACCESS_TTL_MS = 5 * 1000;
const REFRESH_TTL_MS = 10 * 1000;

process.env.NODE_ENV = 'test';

async function basePair() {
  return issueTokenPair({ sub: 'user-1', tenant_id: 'tenant-1', roles: ['admin'] });
}

describe('JWT emisión y verificación', () => {
  afterAll(() => {
    process.env.AUTH_JWT_ACCESS_TTL = originalAccessTtl;
    process.env.AUTH_JWT_REFRESH_TTL = originalRefreshTtl;
  });

  test('emite par de tokens con kid', async () => {
    const pair = await basePair();
    expect(pair.accessToken).toBeDefined();
  const decoded = await verifyAccess(pair.accessToken);
  // decoded puede ser string | JwtPayload
  const payload = decoded as import('jsonwebtoken').JwtPayload;
  expect(payload.sub).toBe('user-1');
  expect(payload.type).toBe('access');
  });

  test('verifica refresh token', async () => {
    const pair = await basePair();
  const decoded = await verifyRefresh(pair.refreshToken);
  const payload = decoded as import('jsonwebtoken').JwtPayload;
  expect(payload.type).toBe('refresh');
  });

  test('rotación de refresh genera nuevo par y bloquea reuso', async () => {
    const pair = await basePair();
    const firstRotate = await rotateRefresh(pair.refreshToken);
    expect(firstRotate).not.toBeNull();
    const secondRotate = await rotateRefresh(pair.refreshToken);
    expect(secondRotate).toBeNull();
  });

  test('token con kid desconocido falla', async () => {
    const pair = await basePair();
    // alterar header kid manualmente (no firmará bien, debe lanzar)
    const parts = pair.accessToken.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    header.kid = 'non-existent';
    const fake = Buffer.from(JSON.stringify(header)).toString('base64url') + '.' + parts[1] + '.' + parts[2];
    await expect(verifyAccess(fake)).rejects.toThrow();
  });

  test('tokens expirados son rechazados', async () => {
    const baseNow = Date.now();
    let fakeNow = baseNow;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);
    try {
      const pair = await basePair();
      fakeNow = baseNow + ACCESS_TTL_MS + 200; // > 5s TTL access
      await expect(verifyAccess(pair.accessToken)).rejects.toMatchObject({ name: 'TokenExpiredError' });
      fakeNow = baseNow + REFRESH_TTL_MS + 200; // > 10s TTL refresh
      await expect(verifyRefresh(pair.refreshToken)).rejects.toMatchObject({ name: 'TokenExpiredError' });
    } finally {
      nowSpy.mockRestore();
    }
  });

  test('tolera skew de reloj menor al TTL', async () => {
    const baseNow = Date.now();
    let fakeNow = baseNow;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);
    try {
      const pair = await basePair();
      fakeNow = baseNow + ACCESS_TTL_MS - 1_000; // sigue dentro del TTL de access
      const decodedAccess: any = await verifyAccess(pair.accessToken);
      expect(decodedAccess.type).toBe('access');
      fakeNow = baseNow + REFRESH_TTL_MS - 1_000; // sigue dentro del TTL de refresh
      const decodedRefresh: any = await verifyRefresh(pair.refreshToken);
      expect(decodedRefresh.type).toBe('refresh');
    } finally {
      nowSpy.mockRestore();
    }
  });

  test('deny-list de access tokens invalida verificaciones subsecuentes', async () => {
    const pair = await basePair();
    const decoded: any = await verifyAccess(pair.accessToken);
    expect(decoded.jti).toBeTruthy();
    await addAccessTokenToDenyList(decoded.jti, 'test', 30);
    await expect(verifyAccess(pair.accessToken)).rejects.toThrow('token_deny_list');
  });

  test('revocación por kid invalida sesiones activas', async () => {
    const pair = await basePair();
    const header = JSON.parse(Buffer.from(pair.accessToken.split('.')[0], 'base64url').toString());
    const kid = header?.kid;
    expect(typeof kid).toBe('string');
    const result = await revokeSessionsByKid(kid);
    expect(result.revoked).toBeGreaterThanOrEqual(1);
    await expect(verifyAccess(pair.accessToken)).rejects.toThrow('kid_revocado');
    await expect(verifyRefresh(pair.refreshToken)).rejects.toThrow('kid_revocado');
    const rotated = await rotateRefresh(pair.refreshToken);
    expect(rotated).toBeNull();
  });
});
