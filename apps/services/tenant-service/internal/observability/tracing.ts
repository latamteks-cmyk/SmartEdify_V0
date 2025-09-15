import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

if (process.env.OTEL_DIAG_LOG_LEVEL) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel[process.env.OTEL_DIAG_LOG_LEVEL as keyof typeof DiagLogLevel] ?? DiagLogLevel.INFO);
}

const exporter = new OTLPTraceExporter({
  // Usa variables estándar OTEL_EXPORTER_OTLP_ENDPOINT si se define; fallback local collector
});

export const otelSdk = new NodeSDK({
  traceExporter: exporter,
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-http': { enabled: true }
  })]
});

export async function startTracing() {
  await otelSdk.start();
}

export async function shutdownTracing() {
  await otelSdk.shutdown();
}