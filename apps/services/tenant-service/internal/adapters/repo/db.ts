import { Pool } from 'pg';
import { config } from '../../config/env.js';
import { context, trace, SpanKind } from '@opentelemetry/api';

export const pool = new Pool({ connectionString: config.dbUrl, max: 10 });

export async function withConn<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const tracer = trace.getTracer('tenant-service-db');
  return await tracer.startActiveSpan('db.withConn', { kind: SpanKind.CLIENT }, async span => {
    const client = await pool.connect();
    try {
      const result = await fn(client);
      span.setStatus({ code: 1 });
      return result;
    } catch (e: any) {
      span.recordException(e);
      span.setStatus({ code: 2, message: e?.message });
      throw e;
    } finally {
      client.release();
      span.end();
    }
  });
}
