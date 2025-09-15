import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import { PgOutboxRepository } from '../../internal/adapters/repo/outbox-pg.js';
import { OutboxPoller } from '../../internal/adapters/publisher/outbox-poller.js';
import { Publisher } from '../../internal/adapters/publisher/publisher.js';
import { brokerPublishTotal, brokerPublishFailedTotal, registry } from '../../internal/metrics/registry.js';

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('Outbox publisher abstraction', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let repo: PgOutboxRepository;
  beforeAll(async () => {
    app = await buildTestApp();
    repo = app.di.outboxRepo;
  });
  afterAll(async () => { await app.close(); });

  it('publica eventos usando publisher y actualiza métricas broker', async () => {
    await repo.enqueue({ aggregateType: 'tenant', aggregateId: '00000000-0000-0000-0000-000000000000', type: 'publisher.test', payload: { v: 1 } });
    // Publisher stub que siempre ok
    const publisher: Publisher = {
      async publish(ev) { return { ok: true }; }
    };
    const poller = new OutboxPoller(repo, publisher, { intervalMs: 50, batchSize: 10, logger: app.log });
    // Ejecutar un tick manual sin schedule
    await poller.tick();
    // Verificar contador broker
    const metrics = await registry.getMetricsAsJSON();
    const pub = metrics.find(m => m.name === 'broker_publish_total');
    expect(pub).toBeTruthy();
    expect(pub!.values.reduce((a: number, v: any) => a + v.value, 0)).toBeGreaterThanOrEqual(1);
    const fail = metrics.find(m => m.name === 'broker_publish_failed_total');
    expect(fail!.values.reduce((a: number, v: any) => a + v.value, 0)).toBe(0);
  });
});
