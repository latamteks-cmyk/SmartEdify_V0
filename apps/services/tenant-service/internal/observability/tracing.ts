import { initializeNodeTracing, type TracingInitializationResult } from '@smartedify/shared/tracing';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

let tracing: TracingInitializationResult | null = null;

export async function startTracing(): Promise<void> {
  if (tracing) return;

  const diagLevel = process.env.OTEL_DIAG_LOG_LEVEL;
  if (diagLevel) {
    const levelKey = diagLevel as keyof typeof DiagLogLevel;
    const level = DiagLogLevel[levelKey] ?? DiagLogLevel.INFO;
    diag.setLogger(new DiagConsoleLogger(), level);
  }

  const exporter = new OTLPTraceExporter({});

  tracing = initializeNodeTracing({
    serviceName: process.env.TENANT_SERVICE_NAME || 'tenant-service',
    environment: process.env.NODE_ENV || 'development',
    exporters: [exporter]
  });

  registerInstrumentations({
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': { enabled: true }
      })
    ]
  });
}

export async function shutdownTracing(): Promise<void> {
  if (!tracing) return;
  try {
    await tracing.shutdown();
  } catch (error) {
    if (process.env.TENANT_LOG_LEVEL === 'debug') {
      // eslint-disable-next-line no-console
      console.warn('[tenant-tracing] shutdown failed', error);
    }
  }
  tracing = null;
}

