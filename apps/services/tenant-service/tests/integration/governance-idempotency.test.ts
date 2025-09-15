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

describe.skipIf(skip)('Governance idempotency', () => {
  let app: any;
  const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const userC = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  beforeEach(async () => {
    await resetDatabase();
    app = await buildTestApp();
  });

  it('same admin transfer is idempotent and different user triggers 409', async () => {
    const tenantId = await createTenant('TenantX');
    const tokenA = fakeJwt(userA);
    // Primero: asignar admin userA
    const r1 = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantId}/governance/transfer-admin`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { fromUserId: userA, toUserId: userA }
    });
    expect(r1.statusCode).toBe(200);
    // Segundo: repetir misma transferencia userA -> userA (idempotente)
    const r2 = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantId}/governance/transfer-admin`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { fromUserId: userA, toUserId: userA }
    });
    expect(r2.statusCode).toBe(200);
    // Tercero: intentar transferir a otro usuario B -> debe dar 409
    const r3 = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantId}/governance/transfer-admin`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { fromUserId: userA, toUserId: userB }
    });
    expect(r3.statusCode).toBe(409);
  });
});
