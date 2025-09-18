import { context, trace, SpanStatusCode, type Span, type SpanAttributes } from '@opentelemetry/api';

export type SpanCallback<T> = (span: Span) => Promise<T> | T;

export async function withSpan<T>(
  tracerName: string,
  spanName: string,
  attributes: SpanAttributes | undefined,
  fn: SpanCallback<T>
): Promise<T>;
export async function withSpan<T>(tracerName: string, spanName: string, fn: SpanCallback<T>): Promise<T>;
export async function withSpan<T>(
  tracerName: string,
  spanName: string,
  attributesOrFn: SpanAttributes | SpanCallback<T> | undefined,
  maybeFn?: SpanCallback<T>
): Promise<T> {
  const tracer = trace.getTracer(tracerName);
  const span = tracer.startSpan(spanName, undefined, context.active());
  const ctx = trace.setSpan(context.active(), span);
  const attributes = typeof attributesOrFn === 'function' ? undefined : attributesOrFn;
  const fn = (typeof attributesOrFn === 'function' ? attributesOrFn : maybeFn) as SpanCallback<T>;

  if (!fn) {
    span.end();
    throw new Error('withSpan requires a callback');
  }

  if (attributes) {
    span.setAttributes(attributes);
  }

  try {
    const result = await context.with(ctx, async () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message });
    span.recordException(error as any);
    throw error;
  } finally {
    span.end();
  }
}
