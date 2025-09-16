jest.mock('ioredis');
// Eliminado mock inline de pg.adapter para usar el mock global
import { issueTokenPair, verifyAccess, verifyRefresh, rotateRefresh } from '../../internal/security/jwt';
import { getCurrentKey } from '../../internal/security/keys';

process.env.NODE_ENV = 'test';

async function basePair() {
  return issueTokenPair({ sub: 'user-1', tenant_id: 'tenant-1', roles: ['admin'] });
}

describe('JWT emisión y verificación', () => {
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
});
