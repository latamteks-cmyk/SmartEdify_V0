import { withConn } from './db.js';
import { Tenant } from '../../domain/models.js';

export class PgTenantRepository {
  async create(data: { name: string; code?: string; timezone: string }): Promise<Tenant> {
    const row = await withConn(async c => {
      const q = `INSERT INTO tenants (name, code, timezone) VALUES ($1,$2,$3) RETURNING id,name,code,timezone,status,created_at`;
      const res = await c.query(q, [data.name, data.code ?? null, data.timezone]);
      return res.rows[0];
    });
    return mapTenant(row);
  }
  async findById(id: string): Promise<Tenant | null> {
    const row = await withConn(async c => {
      const res = await c.query('SELECT id,name,code,timezone,status,created_at FROM tenants WHERE id=$1', [id]);
      return res.rows[0] || null;
    });
    return row ? mapTenant(row) : null;
  }
}

function mapTenant(r: any): Tenant {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    timezone: r.timezone,
    status: r.status,
    createdAt: r.created_at
  };
}
