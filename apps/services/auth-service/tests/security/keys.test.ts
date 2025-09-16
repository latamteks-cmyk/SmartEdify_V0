jest.mock('ioredis');
// Mock específico del pool usado en keys.ts (ruta relativa que keys usa: ../adapters/db/pg.adapter)
// Eliminado mock inline de pg.adapter para usar el mock global
import { getCurrentKey, getNextKey, rotateKeys, buildJwks, getKeyByKid } from '../../internal/security/keys';

// Forzar entorno test
envSetup();

function envSetup() {
  process.env.NODE_ENV = 'test';
}

describe('Signing Keys', () => {
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

  test('rotación promueve next y genera nuevo next', async () => {
    const beforeCurrent = await getCurrentKey();
    const beforeNext = await getNextKey();
    const { newCurrent, newNext } = await rotateKeys();
    expect(newCurrent.kid).toBe(beforeNext!.kid);
    expect(newCurrent.status).toBe('current');
    expect(newNext).toBeDefined();
    expect(newNext!.status).toBe('next');
    // El current anterior pasa a retiring
  });

  test('JWKS incluye current y next/retiring', async () => {
    const { keys } = buildJwks([(await getCurrentKey()), (await getNextKey())!]);
    expect(keys.length).toBeGreaterThanOrEqual(1);
    const first = keys[0];
    expect(first).toHaveProperty('kty');
    expect(first).toHaveProperty('n');
    expect(first).toHaveProperty('e');
    expect(first).toHaveProperty('kid');
    expect(first).toHaveProperty('alg', 'RS256');
  });

  test('lookup por kid devuelve clave', async () => {
    const curr = await getCurrentKey();
    const found = await getKeyByKid(curr.kid);
    expect(found).not.toBeNull();
    expect(found!.kid).toBe(curr.kid);
  });
});
