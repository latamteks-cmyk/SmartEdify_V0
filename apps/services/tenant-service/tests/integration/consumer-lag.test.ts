import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers.js';
import { registry } from '../../internal/metrics/registry.js';

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('Consumer lag metrics (stub/no consumer)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  beforeAll(async () => { app = await buildTestApp(); });
  afterAll(async () => { await app.close(); });

  it('expone gauges de lag aunque no haya broker', async () => {
    const metrics = await registry.getMetricsAsJSON();
    const lag = metrics.find(m => m.name === 'broker_consumer_lag');
    const lagMax = metrics.find(m => m.name === 'broker_consumer_lag_max');
    expect(lag).toBeTruthy();
    expect(lagMax).toBeTruthy();
  });
});
