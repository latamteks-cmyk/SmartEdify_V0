import { describe, it, expect, beforeEach } from 'vitest';
import { PgOutboxRepository } from '../../internal/adapters/repo/outbox-pg.js';
import { resetDatabase } from './helpers.js';

const repo = new PgOutboxRepository();

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('OutboxRepository advanced', () => {
  beforeEach(async () => { await resetDatabase(); });

  it('enqueue -> fetch -> retry temp -> publish', async () => {
    await repo.enqueue({ aggregateType: 'tenant', aggregateId: '00000000-0000-0000-0000-000000000001', type: 'tenant.created', payload: { x: 1 } });
    let batch = await repo.fetchBatch(10);
    expect(batch.length).toBe(1);
    const ev = batch[0];
    // simulate failure
    await repo.markFailedTemporary(ev.id, ev.retryCount + 1, 10, new Error('network')); // delay 10ms
    batch = await repo.fetchBatch(10);
    // Poll resiliente: next_retry_at puede tener precisión a milisegundo y experimentar drift; damos ventana hasta 500ms
    if (!batch.length) {
      const started = Date.now();
      while ((Date.now() - started) < 500) {
        await new Promise(r => setTimeout(r, 25));
        batch = await repo.fetchBatch(10);
        if (batch.length) break;
      }
    }
    expect(batch.length).toBe(1); // debe reaparecer tras vencer el retry
    await repo.markPublished([batch[0].id]);
    const again = await repo.fetchBatch(10);
    expect(again.length).toBe(0);
  });
});
