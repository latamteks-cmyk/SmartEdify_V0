import { context, trace } from '@opentelemetry/api';

export function getActiveTraceparent(): string | null {
  const span = trace.getSpan(context.active());
  if (!span) return null;
  const spanContext = span.spanContext();
  if (!spanContext.traceId || !spanContext.spanId) {
    return null;
  }
  const flags = spanContext.traceFlags.toString(16).padStart(2, '0');
  return `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`;
}
