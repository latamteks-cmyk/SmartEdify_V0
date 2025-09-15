import { withConn } from './db.js';
import { Membership } from '../../domain/models.js';

export class PgMembershipRepository {
  async create(data: { unitId: string; userId: string; relation: string; validFrom: Date; validTo?: Date | null }): Promise<Membership> {
    const row = await withConn(async c => {
      const q = `INSERT INTO unit_memberships (unit_id, user_id, relation, valid_from, valid_to) VALUES ($1,$2,$3,$4,$5) RETURNING id,unit_id,user_id,relation,valid_from,valid_to,active,created_at`;
      const res = await c.query(q, [data.unitId, data.userId, data.relation, data.validFrom, data.validTo ?? null]);
      return res.rows[0];
    });
    return mapMembership(row);
  }
  async countActive(): Promise<number> {
    return await withConn(async c => {
      const res = await c.query('SELECT COUNT(*)::int AS cnt FROM unit_memberships WHERE active');
      return res.rows[0].cnt;
    });
  }
}

function mapMembership(r: any): Membership {
  return {
    id: r.id,
    unitId: r.unit_id,
    userId: r.user_id,
    relation: r.relation,
    validFrom: r.valid_from,
    validTo: r.valid_to,
    active: r.active,
    createdAt: r.created_at
  };
}
