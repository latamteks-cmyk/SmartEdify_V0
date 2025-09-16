jest.mock('ioredis');
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

const originalAccessTtl = process.env.AUTH_JWT_ACCESS_TTL;
const originalRefreshTtl = process.env.AUTH_JWT_REFRESH_TTL;
process.env.AUTH_JWT_ACCESS_TTL = '5s';
process.env.AUTH_JWT_REFRESH_TTL = '10s';
import { issueTokenPair, verifyAccess, verifyRefresh, rotateRefresh } from '../../internal/security/jwt';
import { getCurrentKey } from '../../internal/security/keys';

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
    const decoded: any = await verifyAccess(pair.accessToken);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.type).toBe('access');
  });

  test('verifica refresh token', async () => {
    const pair = await basePair();
    const decoded: any = await verifyRefresh(pair.refreshToken);
    expect(decoded.type).toBe('refresh');
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
      fakeNow = baseNow + 6_000; // > 5s TTL access
      await expect(verifyAccess(pair.accessToken)).rejects.toThrow(/jwt expired/i);
      fakeNow = baseNow + 11_000; // > 10s TTL refresh
      await expect(verifyRefresh(pair.refreshToken)).rejects.toThrow(/jwt expired/i);
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
      fakeNow = baseNow + 4_000; // 4s adelantado, aún válido para access
      const decodedAccess: any = await verifyAccess(pair.accessToken);
      expect(decodedAccess.type).toBe('access');
      fakeNow = baseNow + 9_000; // 9s adelantado, aún válido para refresh
      const decodedRefresh: any = await verifyRefresh(pair.refreshToken);
      expect(decodedRefresh.type).toBe('refresh');
    } finally {
      nowSpy.mockRestore();
    }
  });
});
