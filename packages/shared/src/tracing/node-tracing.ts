import { diag, DiagLogLevel, type DiagLogger } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor, type Sampler, type SpanExporter } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export interface NodeTracingOptions {
  readonly serviceName: string;
  readonly environment?: string;
  readonly exporters?: readonly SpanExporter[];
  readonly sampler?: Sampler;
  readonly resourceAttributes?: Record<string, string | number | boolean | undefined>;
  readonly diagLogger?: DiagLogger;
  readonly diagLogLevel?: DiagLogLevel;
}

export interface TracingInitializationResult {
  readonly provider: NodeTracerProvider;
  readonly shutdown: () => Promise<void>;
}

export function initializeNodeTracing({
  serviceName,
  environment,
  exporters = [],
  sampler,
  resourceAttributes = {},
  diagLogger,
  diagLogLevel = DiagLogLevel.INFO
}: NodeTracingOptions): TracingInitializationResult {
  if (diagLogger) {
    diag.setLogger(diagLogger, diagLogLevel);
  }

  const attributes: Record<string, string | number | boolean | undefined> = {
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    ...resourceAttributes
  };

  if (environment) {
    attributes[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT] = environment;
  }

  const resource = new Resource(attributes);

  const provider = new NodeTracerProvider({
    resource,
    sampler
  });

  for (const exporter of exporters) {
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  }

  provider.register();

  const shutdown = () => provider.shutdown();

  return {
    provider,
    shutdown
  };
}
