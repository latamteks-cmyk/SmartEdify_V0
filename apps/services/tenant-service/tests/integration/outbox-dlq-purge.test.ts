import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import { withConn } from '../../internal/adapters/repo/db.js';

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('Outbox DLQ Purge', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('purga eventos más antiguos que olderThan', async () => {
    // Crear 2 eventos y marcarlos permanentes
    await app.di.outboxRepo.enqueue({ aggregateType: 'tenant', aggregateId: '00000000-0000-0000-0000-000000000000', type: 'purge.test1', payload: { a: 1 } });
    await app.di.outboxRepo.enqueue({ aggregateType: 'tenant', aggregateId: '00000000-0000-0000-0000-000000000000', type: 'purge.test2', payload: { b: 2 } });
    const batch = await app.di.outboxRepo.fetchBatch(10);
    for (const ev of batch) {
      await app.di.outboxRepo.markFailedPermanent(ev.id, new Error('force fail'));
    }

    // Manipular failed_at de uno para simular antigüedad
    await withConn(async c => {
      await c.query(`UPDATE outbox_events_dlq SET failed_at = now() - interval '2 days' WHERE type='purge.test1'`);
      await c.query(`UPDATE outbox_events_dlq SET failed_at = now() - interval '1 hours' WHERE type='purge.test2'`);
    });

    const listBefore = await app.inject({ method: 'GET', url: '/outbox/dlq?limit=10' });
    expect(listBefore.statusCode).toBe(200);
    const beforeItems = listBefore.json().items;
    expect(beforeItems.length).toBeGreaterThanOrEqual(2);

    const olderThan = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // 24h
    const purgeResp = await app.inject({ method: 'DELETE', url: `/outbox/dlq?olderThan=${encodeURIComponent(olderThan)}` });
    expect(purgeResp.statusCode).toBe(200);
    const purged = purgeResp.json();
    expect(purged.purged).toBeGreaterThanOrEqual(1);

    // Verificar en DB directamente para aislar ruido de otros eventos en DLQ
    const remaining = await withConn(c => c.query("SELECT type FROM outbox_events_dlq WHERE type LIKE 'purge.test%'"));
    const types = remaining.rows.map(r => r.type);
    expect(types).toContain('purge.test2');
    expect(types).not.toContain('purge.test1');
  });
});
