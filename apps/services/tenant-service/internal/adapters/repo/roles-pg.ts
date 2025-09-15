import { withConn } from './db.js';

export interface RoleDefinition {
  id: string;
  tenantId: string;
  code: string;
  description?: string | null;
  createdAt: Date;
}

export class PgRolesRepository {
  async ensureRole(tenantId: string, code: string, description?: string): Promise<RoleDefinition> {
    const row = await withConn(async c => {
      const res = await c.query(
        `INSERT INTO role_definitions (tenant_id, code, description)
         VALUES ($1,$2,$3)
         ON CONFLICT (tenant_id, code) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, tenant_id, code, description, created_at`,
        [tenantId, code, description || null]
      );
      return res.rows[0];
    });
    return mapRole(row);
  }

  async assignRole(tenantId: string, code: string, userId: string): Promise<void> {
    await withConn(async c => {
      await c.query(
        `INSERT INTO role_assignments (tenant_id, role_code, user_id)
         VALUES ($1,$2,$3)
         ON CONFLICT (tenant_id, role_code, user_id) WHERE revoked_at IS NULL DO NOTHING`,
        [tenantId, code, userId]
      );
    });
  }

  async revokeRole(tenantId: string, code: string, userId: string): Promise<void> {
    await withConn(async c => {
      await c.query(
        `UPDATE role_assignments SET revoked_at = now()
         WHERE tenant_id = $1 AND role_code = $2 AND user_id = $3 AND revoked_at IS NULL`,
        [tenantId, code, userId]
      );
    });
  }

  async getUserRoles(tenantId: string, userId: string): Promise<string[]> {
    const rows = await withConn(async c => {
      const res = await c.query(
        `SELECT role_code FROM role_assignments
         WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [tenantId, userId]
      );
      return res.rows;
    });
    return rows.map(r => r.role_code);
  }
}

function mapRole(r: any): RoleDefinition {
  return { id: r.id, tenantId: r.tenant_id, code: r.code, description: r.description, createdAt: r.created_at };
}