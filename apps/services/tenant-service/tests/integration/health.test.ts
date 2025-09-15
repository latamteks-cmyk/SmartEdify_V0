import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import { registry } from '../../internal/metrics/registry.js';

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('Health endpoint', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('retorna ok y refleja métricas publisher health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBeDefined();
    expect(body.checks.db.ok).toBe(true);
    // Métricas: broker_publisher_health puede no existir si LoggingPublisher -> gauge = 0|1
    const metrics = await registry.getMetricsAsJSON();
    const healthGauge = metrics.find(m => m.name === 'broker_publisher_health');
    expect(healthGauge).toBeTruthy();
  });
});
