import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import { PgOutboxRepository } from '../../internal/adapters/repo/outbox-pg.js';
import { OutboxPoller } from '../../internal/adapters/publisher/outbox-poller.js';
import { registry } from '../../internal/metrics/registry.js';
import { config } from '../../internal/config/env.js';

// Test fuerza payload que excede límite -> validación falla -> evento se marca failed_permanent y se mueve a DLQ.

describe('outbox validation', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let repo: PgOutboxRepository;
  beforeAll(async () => {
    app = await buildTestApp();
    repo = app.di.outboxRepo;
  });
  afterAll(async () => { await app.close(); });

  it('mueve a DLQ evento con payload demasiado grande y aumenta métrica', async () => {
    const bigSize = config.outboxMaxPayloadBytes + 100;
    const largePayload = { data: 'x'.repeat(bigSize) };
    await repo.enqueue({ aggregateType: 'tenant', aggregateId: '00000000-0000-0000-0000-000000000001', type: 'tenant.created', payload: largePayload });
    const poller = new OutboxPoller(repo, { publish: async () => ({ ok: true }) }, { intervalMs: 50, batchSize: 10, logger: app.log });
    await poller.tick();
    const metrics = await registry.getMetricsAsJSON();
    const validationMetric = metrics.find(m => m.name === 'outbox_validation_failed_total');
    expect(validationMetric).toBeTruthy();
    const sum = validationMetric!.values.reduce((a: number, v: any) => a + v.value, 0);
    expect(sum).toBeGreaterThanOrEqual(1);
  });
});
