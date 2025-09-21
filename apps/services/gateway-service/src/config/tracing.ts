import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { config } from '../config/env';

// Enable diagnostics for development
if (config.NODE_ENV === 'development') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

/**
 * Initialize OpenTelemetry tracing for the Gateway Service
 */
export async function initializeTracing() {
  try {
    if (config.NODE_ENV === 'test') {
      return { provider: undefined as any, shutdown: async () => {} };
    }

    const [shared, otlp, autoInst, instr] = await Promise.all([
      import('@smartedify/shared'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/instrumentation'),
    ]);
    const { initializeNodeTracing } = shared as any;
    const { OTLPTraceExporter } = otlp as any;
    const { getNodeAutoInstrumentations } = autoInst as any;
    const { registerInstrumentations } = instr as any;
    // Configure OTLP exporter if endpoint provided
    const exporterEndpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

    const exporters = exporterEndpoint
      ? [
          new OTLPTraceExporter({
            url: exporterEndpoint,
            headers: parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
          })
        ]
      : [];

    // Initialize tracing with the shared utility
    const { provider, shutdown } = initializeNodeTracing({
      serviceName: 'gateway-service',
      environment: config.NODE_ENV,
      exporters,
      resourceAttributes: {
        'service.version': process.env.npm_package_version || 'unknown'
      }
    });

    // Register auto-instrumentations
    registerInstrumentations({
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation to reduce noise
          '@opentelemetry/instrumentation-fs': {
            enabled: false
          }
        })
      ],
      tracerProvider: provider
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('Shutting down tracing...');
      await shutdown();
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    console.log('✅ Tracing initialized');
    return { provider, shutdown };
  } catch (error) {
    console.error('❌ Failed to initialize tracing:', error);
    throw error;
  }
}

function parseOtlpHeaders(headersStr?: string): Record<string, string> | undefined {
  if (!headersStr) return undefined;
  return headersStr.split(',').reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
}
