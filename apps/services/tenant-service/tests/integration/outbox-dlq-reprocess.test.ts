/// <reference types="../../types/fastify-di" />
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import { withConn } from '../../internal/adapters/repo/db.js';

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('Outbox DLQ Reprocess', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('reprocesa evento desde DLQ y vuelve a pending', async () => {
    // 1. Crear evento y fallarlo permanentemente
    await app.di.outboxRepo.enqueue({ aggregateType: 'tenant', aggregateId: '00000000-0000-0000-0000-000000000000', type: 'test.reprocess', payload: { x: 2 } });
    const batch = await app.di.outboxRepo.fetchBatch(5);
    const ev = batch[0];
    await app.di.outboxRepo.markFailedPermanent(ev.id, new Error('hard fail'));

    // 2. Endpoint GET DLQ lo muestra
    const listResp = await app.inject({ method: 'GET', url: '/outbox/dlq?limit=10' });
    expect(listResp.statusCode).toBe(200);
    const listBody = listResp.json();
    expect(listBody.items.find((i: any) => i.id === ev.id)).toBeTruthy();

    // 3. Reprocesar
    const repResp = await app.inject({ method: 'POST', url: `/outbox/dlq/${ev.id}/reprocess` });
    expect(repResp.statusCode).toBe(200);
    const repBody = repResp.json();
    expect(repBody.status).toBe('reprocessed');

    // 4. Ya no debe estar en DLQ y debe existir en outbox con status pending
    const rows = await withConn(async c => {
      const r1 = await c.query('SELECT status FROM outbox_events WHERE id=$1', [ev.id]);
      const r2 = await c.query('SELECT 1 FROM outbox_events_dlq WHERE id=$1', [ev.id]);
      return { outbox: r1.rows[0], dlq: r2.rowCount };
    });
    expect(rows.dlq).toBe(0);
    expect(rows.outbox.status).toBe('pending');
  });
});
