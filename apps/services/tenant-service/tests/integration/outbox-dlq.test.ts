import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import { withConn } from '../../internal/adapters/repo/db.js';

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('Outbox DLQ', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('mueve evento a outbox_events_dlq cuando markFailedPermanent', async () => {
    // Enqueue event
    await app.di.outboxRepo.enqueue({ aggregateType: 'tenant', aggregateId: '00000000-0000-0000-0000-000000000000', type: 'test.dlq', payload: { x: 1 } });
    const batch = await app.di.outboxRepo.fetchBatch(5);
    expect(batch.length).toBeGreaterThan(0);
    const ev = batch[0];

    // Force permanent failure
    await app.di.outboxRepo.markFailedPermanent(ev.id, new Error('boom'));

    const rows = await withConn(async c => {
      const r1 = await c.query('SELECT status, last_error FROM outbox_events WHERE id=$1', [ev.id]);
      const r2 = await c.query('SELECT id, original_status FROM outbox_events_dlq WHERE id=$1', [ev.id]);
      return { r1: r1.rows[0], r2: r2.rows[0] };
    });

    expect(rows.r1.status).toBe('failed_permanent');
    expect(rows.r1.last_error).toContain('boom');
    expect(rows.r2.original_status).toBe('failed_permanent');
  });
});
