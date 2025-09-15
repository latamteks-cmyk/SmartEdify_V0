import { withConn } from './db.js';
import { GovernancePosition } from '../../domain/models.js';

export class PgGovernanceRepository {
  async createAdmin(tenantId: string, userId: string): Promise<GovernancePosition> {
    try {
      const row = await withConn(async c => {
        const q = `INSERT INTO governance_positions (tenant_id, user_id, role) VALUES ($1,$2,'admin') RETURNING id,tenant_id,user_id,role,delegated_from_user_id,starts_at,ends_at,chain_hash,created_at`;
        const res = await c.query(q, [tenantId, userId]);
        return res.rows[0];
      });
      return mapGovernance(row);
    } catch (err: any) {
      if (err.code === '23505') {
        // Unique violation -> ya existe admin activo
        throw new Error('admin_conflict');
      }
      throw err;
    }
  }

  async isAdmin(tenantId: string, userId: string): Promise<boolean> {
    const row = await withConn(async c => {
      const res = await c.query(
        `SELECT 1 FROM governance_positions
         WHERE tenant_id = $1 AND user_id = $2 AND role = 'admin'
           AND (ends_at IS NULL OR ends_at > now())
         LIMIT 1`,
        [tenantId, userId]
      );
      return res.rows[0];
    });
    return !!row;
  }
}

function mapGovernance(r: any): GovernancePosition {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    userId: r.user_id,
    role: r.role,
    delegatedFromUserId: r.delegated_from_user_id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    chainHash: r.chain_hash,
    createdAt: r.created_at
  };
}
