import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

let otelSdk: NodeSDK | null = null;

export async function startTracing() {
  if (process.env.OTEL_DIAG_LOG_LEVEL) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel[process.env.OTEL_DIAG_LOG_LEVEL as keyof typeof DiagLogLevel] ?? DiagLogLevel.INFO);
  }

  // Construir el exporter aquí para que tome variables de entorno definidas en runtime
  const exporter = new OTLPTraceExporter({
    // usa OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_EXPORTER_OTLP_TRACES_ENDPOINT si están definidos
  });

  otelSdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { enabled: true }
    })]
  });

  await otelSdk.start();
}

export async function shutdownTracing() {
  if (otelSdk) {
    await otelSdk.shutdown();
    otelSdk = null;
  }
}