import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestApp, resetDatabase, fakeJwt } from './helpers.js';
import { withConn } from '../../internal/adapters/repo/db.js';

async function createTenant(name: string) {
  return await withConn(async c => {
    const r = await c.query("INSERT INTO tenants (name, code) VALUES ($1,$2) RETURNING id", [name, name.slice(0,5)]);
    return r.rows[0].id as string;
  });
}

const skip = process.env.SKIP_DB_TESTS === '1';
describe.skipIf(skip)('Governance transfer', () => {
  let app: any;
  beforeEach(async () => {
    await resetDatabase();
    app = await buildTestApp();
  });

  it('creates first admin then conflict on second', async () => {
    const tenantId = await createTenant('TenantA');
    const token = fakeJwt('11111111-1111-1111-1111-111111111111');
    const res1 = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantId}/governance/transfer-admin`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { fromUserId: '11111111-1111-1111-1111-111111111111', toUserId: '11111111-1111-1111-1111-111111111111' }
    });
    expect(res1.statusCode).toBe(200);

    const res2 = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantId}/governance/transfer-admin`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { fromUserId: '11111111-1111-1111-1111-111111111111', toUserId: '22222222-2222-2222-2222-222222222222' }
    });
    expect(res2.statusCode).toBe(409);
  });
});
