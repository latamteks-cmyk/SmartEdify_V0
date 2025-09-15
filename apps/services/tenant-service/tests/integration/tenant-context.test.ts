import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestApp, resetDatabase, fakeJwt } from './helpers.js';
import { withConn } from '../../internal/adapters/repo/db.js';

async function createTenantAndAdmin() {
  const tenantId = await withConn(async c => {
    const r = await c.query("INSERT INTO tenants (name, code) VALUES ('T1','t1') RETURNING id");
    return r.rows[0].id as string;
  });
  await withConn(async c => {
    await c.query("INSERT INTO governance_positions (tenant_id,user_id,role) VALUES ($1,$2,'admin')", [tenantId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']);
  });
  return tenantId;
}

const skip = process.env.SKIP_DB_TESTS === '1';
describe.skipIf(skip)('GET /tenant-context', () => {
  let app: any;
  beforeEach(async () => {
    await resetDatabase();
    app = await buildTestApp();
  });

  it('returns 200 with roles for admin', async () => {
    const tenantId = await createTenantAndAdmin();
    const token = fakeJwt('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const res = await app.inject({
      method: 'GET',
      url: `/tenant-context?tenantId=${tenantId}&userId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.roles).toContain('admin');
  });

  it('returns 404 for user without context', async () => {
    const tenantId = await createTenantAndAdmin();
    const unknownUser = '11111111-2222-3333-4444-555555555555'; // UUID válido sin contexto
    const token = fakeJwt(unknownUser);
    const res = await app.inject({
      method: 'GET',
      url: `/tenant-context?tenantId=${tenantId}&userId=${unknownUser}`,
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.statusCode).toBe(404);
  });

  it('aggregates custom assigned roles with admin', async () => {
    const tenantId = await createTenantAndAdmin();
    const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // admin ya creado
    // Crear role definition y assignment
    await withConn(c => c.query(`INSERT INTO role_definitions (tenant_id, code, description) VALUES ($1,'editor','Editor') ON CONFLICT DO NOTHING`, [tenantId]));
    await withConn(c => c.query(`INSERT INTO role_assignments (tenant_id, role_code, user_id) VALUES ($1,'editor',$2) ON CONFLICT DO NOTHING`, [tenantId, userId]));
    const token = fakeJwt(userId);
    const res = await app.inject({ method: 'GET', url: `/tenant-context?tenantId=${tenantId}&userId=${userId}`, headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.roles).toEqual(expect.arrayContaining(['admin','editor']));
    // Version estable para la misma combinación
    const res2 = await app.inject({ method: 'GET', url: `/tenant-context?tenantId=${tenantId}&userId=${userId}`, headers: { Authorization: `Bearer ${token}` } });
    expect(res2.json().version).toBe(body.version);
  });
});
