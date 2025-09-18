import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { Pool, type PoolClient, type PoolConfig } from 'pg';

export interface TracingPoolOptions extends PoolConfig {
  readonly tracerName?: string;
  readonly spanName?: string;
}

export interface TracingPool {
  readonly pool: Pool;
  readonly withConn: <T>(handler: (client: PoolClient) => Promise<T>) => Promise<T>;
  readonly shutdown: () => Promise<void>;
}

export function createTracingPool({
  tracerName = 'postgres',
  spanName = 'db.withConn',
  ...config
}: TracingPoolOptions): TracingPool {
  const pool = new Pool(config);

  const withConn = async <T>(handler: (client: PoolClient) => Promise<T>): Promise<T> => {
    const tracer = trace.getTracer(tracerName);
    return await tracer.startActiveSpan(
      spanName,
      { kind: SpanKind.CLIENT },
      async span => {
        const client = await pool.connect();
        try {
          const result = await handler(client);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
          throw error;
        } finally {
          client.release();
          span.end();
        }
      }
    );
  };

  const shutdown = async () => {
    await pool.end();
  };

  return {
    pool,
    withConn,
    shutdown
  };
}

