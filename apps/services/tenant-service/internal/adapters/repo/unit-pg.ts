import { withConn } from './db.js';
import { Unit } from '../../domain/models.js';

export class PgUnitRepository {
  async create(data: { tenantId: string; code: string; type: string; parentUnitId?: string; areaM2?: number }): Promise<Unit> {
    const row = await withConn(async c => {
      const q = `INSERT INTO units (tenant_id, code, type, parent_unit_id, area_m2) VALUES ($1,$2,$3,$4,$5) RETURNING id,tenant_id,code,type,parent_unit_id,area_m2,active,created_at`;
      const res = await c.query(q, [data.tenantId, data.code, data.type, data.parentUnitId ?? null, data.areaM2 ?? null]);
      return res.rows[0];
    });
    return mapUnit(row);
  }
  async listByTenant(tenantId: string): Promise<Unit[]> {
    const rows = await withConn(async c => {
      const res = await c.query('SELECT id,tenant_id,code,type,parent_unit_id,area_m2,active,created_at FROM units WHERE tenant_id=$1', [tenantId]);
      return res.rows;
    });
    return rows.map(mapUnit);
  }
}

function mapUnit(r: any): Unit {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    code: r.code,
    type: r.type,
    parentUnitId: r.parent_unit_id,
    areaM2: r.area_m2,
    active: r.active,
    createdAt: r.created_at
  };
}
