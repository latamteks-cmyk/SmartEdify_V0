import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestApp, resetDatabase } from './helpers.js';
import { withConn } from '../../internal/adapters/repo/db.js';

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('Outbox retries scheduling', () => {
  let app: any;
  beforeEach(async () => {
    await resetDatabase();
    app = await buildTestApp();
  });

  async function fetchEvent(id: string) {
    return await withConn(async c => {
      const r = await c.query('SELECT id, retry_count, next_retry_at FROM outbox_events WHERE id=$1', [id]);
      return r.rows[0];
    });
  }

  it('increments retry_count and schedules increasing next_retry_at', async () => {
    // enqueue via repo
    await app.di.outboxRepo.enqueue({ aggregateType: 'tenant', aggregateId: '00000000-0000-0000-0000-000000000000', type: 'test.event', payload: { a: 1 } });
    const batch = await app.di.outboxRepo.fetchBatch(10);
    expect(batch.length).toBe(1);
    const ev = batch[0];

    const start = Date.now();
    await app.di.outboxRepo.markFailedTemporary(ev.id, ev.retryCount + 1, 25, new Error('network')); // 25ms delay
    let after1 = await fetchEvent(ev.id);
    expect(after1.retry_count).toBe(1);
    expect(after1.next_retry_at).not.toBeNull();
    const diff1 = new Date(after1.next_retry_at).getTime() - start;
  // Dado que el scheduling usa arithmetic en DB + latencias mínimas, toleramos >=5ms
  expect(diff1).toBeGreaterThanOrEqual(5);

    // Segundo retry con mayor delay
    const start2 = Date.now();
    await app.di.outboxRepo.markFailedTemporary(ev.id, after1.retry_count + 1, 60, new Error('still fail'));
    let after2 = await fetchEvent(ev.id);
    expect(after2.retry_count).toBe(2);
    const diff2 = new Date(after2.next_retry_at).getTime() - start2;
    expect(diff2).toBeGreaterThanOrEqual(40);
    expect(diff2).toBeGreaterThan(diff1);
    expect(new Date(after2.next_retry_at).getTime()).toBeGreaterThan(new Date(after1.next_retry_at).getTime());
  });
});
