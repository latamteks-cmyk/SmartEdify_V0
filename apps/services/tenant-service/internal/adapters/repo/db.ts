import { createTracingPool } from '@smartedify/shared/postgres';
import { config } from '../../config/env.js';

const tracingPool = createTracingPool({
  connectionString: config.dbUrl,
  max: 10,
  tracerName: 'tenant-service-db',
  spanName: 'db.withConn'
});

export const pool = tracingPool.pool;
export const withConn = tracingPool.withConn;
