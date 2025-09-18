jest.mock('ioredis');
// Mock específico del pool usado en keys.ts (ruta relativa que keys usa: ../adapters/db/pg.adapter)
// Eliminado mock inline de pg.adapter para usar el mock global (se configura en jest.setup)
import { getCurrentKey, getNextKey, rotateKeys, getKeyByKid, getPublicJwks, __resetKeyCacheForTests } from '../../internal/security/keys';
const dbPoolMock = require('../../internal/adapters/db/pg.adapter').default as any;

// Forzar entorno test
envSetup();

function envSetup() {
  process.env.NODE_ENV = 'test';
}

describe('Signing Keys', () => {
  beforeEach(() => {
    dbPoolMock.__resetMock?.();
    __resetKeyCacheForTests();
  });
  test('crea clave inicial al solicitar current', async () => {
    const k = await getCurrentKey();
    expect(k).toBeDefined();
    expect(k.status).toBe('current');
    const again = await getCurrentKey();
    expect(again.kid).toBe(k.kid); // cache hit
  });

  test('genera next cuando no existe', async () => {
    const kNext = await getNextKey();
    expect(kNext).toBeDefined();
    expect(kNext!.status).toBe('next');
  });

  test('rotación promueve next, marca la actual como retiring y actualiza JWKS', async () => {
    const beforeCurrent = await getCurrentKey();
    const beforeNext = await getNextKey();
    const { newCurrent, newNext } = await rotateKeys();
    expect(newCurrent.kid).toBe(beforeNext!.kid);
    expect(newCurrent.status).toBe('current');
    expect(newNext).toBeDefined();
    expect(newNext!.status).toBe('next');
    const retired = await getKeyByKid(beforeCurrent.kid);
    expect(retired).not.toBeNull();
    expect(retired!.status).toBe('retiring');
    expect(retired!.retiring_at).toBeInstanceOf(Date);
    const jwks = await getPublicJwks();
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.some((k: any) => k.status === 'current' && k.kid === newCurrent.kid)).toBe(true);
    expect(jwks.keys.some((k: any) => k.status === 'next' && k.kid === newNext!.kid)).toBe(true);
    expect(jwks.keys.some((k: any) => k.status === 'retiring' && k.kid === beforeCurrent.kid)).toBe(true);
  });

  test('getPublicJwks expone current/next/retiring', async () => {
    await getCurrentKey();
    await getNextKey();
    await rotateKeys();
    const jwks = await getPublicJwks();
    expect(Array.isArray(jwks.keys)).toBe(true);
    const statuses = new Set(jwks.keys.map((k: any) => k.status));
    expect(statuses.has('current')).toBe(true);
    expect(statuses.has('next')).toBe(true);
    expect(statuses.has('retiring')).toBe(true);
    const byStatus = jwks.keys.reduce((acc: Record<string, any[]>, key: any) => {
      acc[key.status] = acc[key.status] || [];
      acc[key.status].push(key);
      return acc;
    }, {});
    expect(byStatus.current).toBeDefined();
    expect(byStatus.next).toBeDefined();
    expect(byStatus.retiring).toBeDefined();
    expect(byStatus.current!.every((k: any) => k.use === 'sig' && k.alg === 'RS256')).toBe(true);
    expect(byStatus.next!.every((k: any) => k.use === 'sig' && k.alg === 'RS256')).toBe(true);
    expect(byStatus.retiring!.length).toBeGreaterThan(0);
    for (const key of jwks.keys) {
      expect(key).toHaveProperty('kty');
      expect(key).toHaveProperty('n');
      expect(key).toHaveProperty('e');
      expect(key).toHaveProperty('kid');
      expect(key).toHaveProperty('alg', 'RS256');
    }
  });

  test('lookup por kid devuelve clave', async () => {
    const curr = await getCurrentKey();
    const found = await getKeyByKid(curr.kid);
    expect(found).not.toBeNull();
    expect(found!.kid).toBe(curr.kid);
  });

  test('rotaciones consecutivas conservan historial multi-kid', async () => {
    const initialCurrent = await getCurrentKey();
    const initialNext = await getNextKey();
    const firstRotation = await rotateKeys();
    expect(firstRotation.newCurrent.kid).toBe(initialNext!.kid);
    expect(firstRotation.newNext).not.toBeNull();

    const secondRotation = await rotateKeys();
    expect(secondRotation.newCurrent.kid).toBe(firstRotation.newNext!.kid);

    const jwks = await getPublicJwks();
    const retiringKids = jwks.keys.filter((k: any) => k.status === 'retiring').map((k: any) => k.kid);
    expect(new Set(retiringKids).size).toBe(retiringKids.length);
    expect(retiringKids).toEqual(expect.arrayContaining([initialCurrent.kid, initialNext!.kid]));
    const currentKids = jwks.keys.filter((k: any) => k.status === 'current').map((k: any) => k.kid);
    expect(currentKids).toContain(secondRotation.newCurrent.kid);
    const nextKids = jwks.keys.filter((k: any) => k.status === 'next').map((k: any) => k.kid);
    expect(nextKids).toContain(secondRotation.newNext!.kid);
  });
});
