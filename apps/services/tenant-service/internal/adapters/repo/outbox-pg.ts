import { withConn } from './db.js';

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  type: string;
  payload: any;
  createdAt: Date;
  publishedAt: Date | null;
  status: string;
  retryCount: number;
  nextRetryAt: Date | null;
  lastError: string | null;
}

export class PgOutboxRepository {
  async enqueue(e: { aggregateType: string; aggregateId: string; type: string; payload: any }): Promise<void> {
    await withConn(async c => {
      await c.query(
        'INSERT INTO outbox_events (aggregate_type, aggregate_id, type, payload) VALUES ($1,$2,$3,$4)',
        [e.aggregateType, e.aggregateId, e.type, JSON.stringify(e.payload)]
      );
    });
  }

  async fetchBatch(limit: number): Promise<OutboxEvent[]> {
    return await withConn(async c => {
      const res = await c.query(
        `SELECT id, aggregate_type, aggregate_id, type, payload, created_at, published_at, status, retry_count, next_retry_at, last_error
         FROM outbox_events
         WHERE status = 'pending'
           AND (published_at IS NULL)
           AND (next_retry_at IS NULL OR next_retry_at <= now())
         ORDER BY created_at ASC, retry_count ASC
         LIMIT $1`,
        [limit]
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        aggregateType: r.aggregate_type,
        aggregateId: r.aggregate_id,
        type: r.type,
        payload: r.payload,
        createdAt: r.created_at,
        publishedAt: r.published_at,
        status: r.status,
        retryCount: r.retry_count,
        nextRetryAt: r.next_retry_at,
        lastError: r.last_error
      }));
    });
  }

  async markPublished(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await withConn(async c => {
      await c.query("UPDATE outbox_events SET published_at = now(), status='published' WHERE id = ANY($1::uuid[])", [ids]);
    });
  }

  async countPending(): Promise<number> {
    const val = await withConn(async c => {
      const res = await c.query("SELECT COUNT(*)::int AS cnt FROM outbox_events WHERE status='pending' AND published_at IS NULL");
      return res.rows.length ? Number(res.rows[0].cnt) : 0;
    });
    return typeof val === 'number' && !Number.isNaN(val) ? val : 0;
  }

  async markFailedTemporary(id: string, retryCount: number, delayMs: number, error: any): Promise<void> {
    await withConn(async c => {
      // Construimos intervalo seguro usando cast directo a interval.
      await c.query(
        `UPDATE outbox_events
           SET retry_count = $2,
               last_error = left($3, 500),
               next_retry_at = now() + ($4 || ' milliseconds')::interval
         WHERE id = $1 AND status='pending'`,
        [id, retryCount, String(error), `${delayMs}`]
      );
    });
  }

  async markFailedPermanent(id: string, error: any): Promise<void> {
    await withConn(async c => {
      // Defensa: asegurar existencia de tabla DLQ (evita fallos si migración aún no se aplicó en entorno de test)
      await c.query(`CREATE TABLE IF NOT EXISTS outbox_events_dlq (
        id UUID PRIMARY KEY,
        aggregate_type TEXT NOT NULL,
        aggregate_id UUID NOT NULL,
        type TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_error TEXT NULL,
        retry_count INT NOT NULL,
        original_status TEXT NOT NULL,
        moved_reason TEXT NOT NULL DEFAULT 'failed_permanent'
      )`);
      await c.query('CREATE INDEX IF NOT EXISTS idx_outbox_dlq_failed_at ON outbox_events_dlq(failed_at)');
      await c.query('BEGIN');
      try {
        const res = await c.query(
          `UPDATE outbox_events
              SET status='failed_permanent', last_error = left($2, 500), next_retry_at=NULL
            WHERE id=$1
            RETURNING id, aggregate_type, aggregate_id, type, payload, created_at, retry_count, status, last_error`,
          [id, String(error)]
        );
        if (res.rowCount === 1) {
          const r = res.rows[0];
          await c.query(
            `INSERT INTO outbox_events_dlq (id, aggregate_type, aggregate_id, type, payload, created_at, last_error, retry_count, original_status)
             VALUES ($1,$2,$3,$4,$5,$6,left($7,500),$8,$9)
             ON CONFLICT (id) DO NOTHING`,
            [r.id, r.aggregate_type, r.aggregate_id, r.type, r.payload, r.created_at, r.last_error, r.retry_count, r.status]
          );
        }
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
  }

  async listDLQ(limit: number): Promise<any[]> {
    return await withConn(async c => {
      const r = await c.query(
        `SELECT id, aggregate_type, aggregate_id, type, payload, created_at, failed_at, last_error, retry_count, original_status, moved_reason
           FROM outbox_events_dlq
           ORDER BY failed_at DESC
           LIMIT $1`,
        [limit]
      );
      return r.rows;
    });
  }

  async countDLQ(): Promise<number> {
    const cnt: number = await withConn(async c => {
      const r = await c.query('SELECT COUNT(*)::int AS cnt FROM outbox_events_dlq');
      return Number(r.rows[0]?.cnt) || 0;
    });
    return cnt;
  }

  async purgeDLQOlderThan(olderThan: Date): Promise<number> {
    const deleted: number = await withConn(async c => {
      const r = await c.query('DELETE FROM outbox_events_dlq WHERE failed_at < $1 RETURNING id', [olderThan]);
      return r.rowCount || 0;
    });
    return deleted;
  }

  async reprocessFromDLQ(id: string): Promise<boolean> {
    const result: boolean = await withConn(async c => {
      await c.query('BEGIN');
      try {
        const sel = await c.query('SELECT * FROM outbox_events_dlq WHERE id=$1 FOR UPDATE', [id]);
        if (sel.rowCount === 0) { await c.query('ROLLBACK'); return false; }
        const ev = sel.rows[0];
        await c.query(
          `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, type, payload, created_at, published_at, status, retry_count, last_error, next_retry_at)
             VALUES ($1,$2,$3,$4,$5,$6,NULL,'pending',0,NULL,NULL)
           ON CONFLICT (id) DO UPDATE SET status='pending', retry_count=0, last_error=NULL, next_retry_at=NULL, published_at=NULL`,
          [ev.id, ev.aggregate_type, ev.aggregate_id, ev.type, ev.payload, ev.createdAt]
        );
        await c.query('DELETE FROM outbox_events_dlq WHERE id=$1', [id]);
        await c.query('COMMIT');
        return true;
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
    return result;
  }
}
