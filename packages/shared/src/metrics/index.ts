import { Registry, collectDefaultMetrics } from 'prom-client';

export interface MetricsInitializationOptions {
  readonly prefix?: string;
  readonly registry?: Registry;
  readonly defaultMetrics?: boolean;
  readonly defaultMetricsInterval?: number;
}

export interface MetricsController {
  readonly registry: Registry;
  readonly metrics: () => Promise<string>;
  readonly reset: () => void;
}

export function initializePrometheusMetrics({
  prefix,
  registry = new Registry(),
  defaultMetrics = true,
  defaultMetricsInterval
}: MetricsInitializationOptions = {}): MetricsController {
  if (defaultMetrics) {
    collectDefaultMetrics({
      prefix,
      register: registry
    });
  }

  const metrics = () => registry.metrics();
  const reset = () => registry.resetMetrics();

  return {
    registry,
    metrics,
    reset
  };
}
