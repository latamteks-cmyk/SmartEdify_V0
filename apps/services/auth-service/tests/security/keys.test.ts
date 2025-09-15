jest.mock('ioredis');
// Mock específico del pool usado en keys.ts (ruta relativa que keys usa: ../adapters/db/pg.adapter)
jest.mock('../../internal/adapters/db/pg.adapter', () => {
  class MockPool {
    private data: { auth_signing_keys: any[] } = { auth_signing_keys: [] };
    query(sql: string, params?: any[]) {
      const lower = sql.toLowerCase();
      if (lower.startsWith('select * from auth_signing_keys where status in')) {
        const wantRetiring = sql.includes('retiring');
        const statuses = wantRetiring ? ['current','next','retiring'] : ['current','next'];
        const rows = this.data.auth_signing_keys.filter(k => statuses.includes(k.status));
        return Promise.resolve({ rows });
      }
      if (lower.startsWith('select * from auth_signing_keys where status=') && sql.includes("'current'")) {
        const rows = this.data.auth_signing_keys.filter(k => k.status === 'current');
        return Promise.resolve({ rows });
      }
      if (lower.startsWith('select * from auth_signing_keys where status=') && sql.includes("'next'")) {
        const rows = this.data.auth_signing_keys.filter(k => k.status === 'next');
        return Promise.resolve({ rows });
      }
      if (lower.startsWith('select * from auth_signing_keys where kid=')) {
        const kid = params?.[0];
        const rows = this.data.auth_signing_keys.filter(k => k.kid === kid);
        return Promise.resolve({ rows });
      }
      if (lower.startsWith('insert into auth_signing_keys')) {
        const [kid, pem_private, pem_public, status] = params!;
        const row = { kid, pem_private, pem_public, status, created_at: new Date() };
        this.data.auth_signing_keys.push(row);
        return Promise.resolve({ rows: [row] });
      }
      if (lower.startsWith('update auth_signing_keys set promoted_at')) {
        const kid = params?.[0];
        const row = this.data.auth_signing_keys.find(k => k.kid === kid);
        if (row) row.promoted_at = new Date();
        return Promise.resolve({ rows: [] });
      }
      if (lower.startsWith('update auth_signing_keys set status=')) {
        const kid = params?.[0];
        const row = this.data.auth_signing_keys.find(k => k.kid === kid);
        if (row) {
          if (sql.includes("'retiring'")) { row.status = 'retiring'; row.retiring_at = new Date(); }
          if (sql.includes("'current'")) { row.status = 'current'; row.promoted_at = new Date(); }
        }
        return Promise.resolve({ rows: [] });
      }
      if (['begin','commit','rollback'].includes(lower.trim())) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    }
    async connect() { return { query: this.query.bind(this), release: () => {} } as any; }
  }
  const pool = new MockPool();
  return { __esModule: true, default: pool };
});
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
