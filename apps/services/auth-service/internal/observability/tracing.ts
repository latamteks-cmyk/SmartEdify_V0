import { initializeNodeTracing, type TracingInitializationResult } from '@smartedify/shared/tracing';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

let tracing: TracingInitializationResult | null = null;

export async function startTracing(): Promise<void> {
  if (tracing) return;

  const serviceName = process.env.AUTH_SERVICE_NAME || 'auth-service';
  const environment = process.env.NODE_ENV || 'development';
  const exporterEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

  const exporter = new OTLPTraceExporter({
    url: exporterEndpoint,
    headers: {}
  });

  tracing = initializeNodeTracing({
    serviceName,
    environment,
    exporters: [exporter]
  });

  registerInstrumentations({
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-express': { enabled: true }
      })
    ]
  });
}

export async function shutdownTracing(): Promise<void> {
  if (!tracing) return;
  try {
    await tracing.shutdown();
  } catch (error) {
    if (process.env.AUTH_TEST_LOGS) {
      // eslint-disable-next-line no-console
      console.error('[tracing] shutdown failed', error);
    }
  }
  tracing = null;
}

