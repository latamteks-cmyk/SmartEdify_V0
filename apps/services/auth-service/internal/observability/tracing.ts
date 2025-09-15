import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk: NodeSDK | null = null;

export async function startTracing() {
  if (sdk) return; // idempotente
  const serviceName = process.env.AUTH_SERVICE_NAME || 'auth-service';
  const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

  const exporter = new OTLPTraceExporter({
    // si no definimos endpoint, el exporter usará default (localhost:4318)
    url: exporterEndpoint,
    headers: {}
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'dev'
    }),
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-express': { enabled: true }
      })
    ]
  });
  await sdk.start();
}

export async function shutdownTracing() {
  if (!sdk) return;
  await sdk.shutdown().catch(() => {});
  sdk = null;
}
