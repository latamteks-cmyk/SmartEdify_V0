import { shutdownTracing } from '../internal/observability/tracing';

afterAll(async () => {
  await shutdownTracing();
});
