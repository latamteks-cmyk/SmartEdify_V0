import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // JWT Configuration
  JWKS_URL: z.string().url(),
  // Optional: multiple JWKS endpoints, comma-separated
  JWKS_URLS: z.string().optional(),
  // JWKS caching controls (ms)
  JWKS_CACHE_MAX_AGE: z.string().transform(Number).default('600000'),
  JWKS_COOLDOWN_MS: z.string().transform(Number).default('30000'),
  ISSUER: z.string().url(),
  AUDIENCE: z.string(),
  
  // Service URLs
  AUTH_SERVICE_URL: z.string().url(),
  USER_SERVICE_URL: z.string().url(),
  TENANT_SERVICE_URL: z.string().url(),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('false'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Health Check
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'),

  // OTLP Exporter (Tracing)
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),

  // Metrics
  METRICS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  METRICS_ROUTE: z.string().default('/metrics'),
  METRICS_PREFIX: z.string().default('gateway_'),

  // TLS for outgoing connections
  OUTGOING_TLS_REJECT_UNAUTHORIZED: z.string().transform(val => val !== 'false').default('true'),
  OUTGOING_TLS_CA_FILE: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment configuration:', error);
  process.exit(1);
}

export { config };
