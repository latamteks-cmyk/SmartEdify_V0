import { parseEnv as parseEnvironment } from '@smartedify/shared/env';
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['test','development','production']).default('development'),
  AUTH_ADMIN_API_KEY: z.string().min(1, 'AUTH_ADMIN_API_KEY requerido en admin endpoints').optional(),
  AUTH_ADMIN_API_HEADER: z.string().default('x-admin-api-key').optional(),
  // Puertos y logging
  PORT: z.coerce.number().default(8080),
  AUTH_PORT: z.coerce.number().default(8080).optional(),
  AUTH_LOG_LEVEL: z.string().default('info').optional(),
  AUTH_SERVICE_NAME: z.string().default('auth-service').optional(),
  AUTH_TEST_LOGS: z.string().optional(), // flag de diagnóstico
  DEBUG_AUTH: z.string().optional(),
  DEBUG_REFRESH: z.string().optional(),
  // Postgres
  PGHOST: z.string().default('localhost').optional(),
  PGPORT: z.coerce.number().default(5432).optional(),
  PGUSER: z.string().default('postgres').optional(),
  PGPASSWORD: z.string().default('postgres').optional(),
  PGDATABASE: z.string().default('smartedify').optional(),
  // Redis
  REDIS_HOST: z.string().default('localhost').optional(),
  REDIS_PORT: z.coerce.number().default(6379).optional(),
  // Emisión/Verificación JWT
  AUTH_JWT_ACCESS_SECRET: z.string().optional(),
  AUTH_JWT_REFRESH_SECRET: z.string().optional(),
  AUTH_JWT_ACCESS_TTL: z.string().default('900s').optional(),
  AUTH_JWT_REFRESH_TTL: z.string().default('30d').optional(),
  // Issuer/Public URLs
  AUTH_ISSUER: z.string().optional(),
  AUTH_ISSUER_URL: z.string().optional(),
  AUTH_PUBLIC_URL: z.string().optional(),
  AUTH_BASE_URL: z.string().optional(),
  AUTH_HOST: z.string().default('localhost').optional(),
  AUTH_USE_TLS: z.enum(['true','false']).default('false').optional(),
  // Rate limiting
  AUTH_LOGIN_WINDOW_MS: z.coerce.number().default(60000).optional(),
  AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().default(10).optional(),
  AUTH_BRUTE_WINDOW_SEC: z.coerce.number().default(300).optional(),
  AUTH_BRUTE_MAX_ATTEMPTS: z.coerce.number().default(20).optional(),
  AUTH_ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000).optional(),
  AUTH_ADMIN_RATE_LIMIT_MAX: z.coerce.number().default(10).optional(),
  // Roles/Permisos por defecto
  AUTH_DEFAULT_ROLE: z.string().default('user').optional(),
  AUTH_FALLBACK_ROLES: z.string().optional(), // lista separada por espacios o comas
  AUTH_FALLBACK_PERMISSIONS: z.string().optional(),
  AUTH_ROLE_PERMISSIONS: z.string().optional(), // JSON para overrides
  // User Service cliente
  AUTH_USER_SERVICE_MODE: z.enum(['mock','http']).optional(),
  AUTH_USER_SERVICE_URL: z.string().optional(),
  AUTH_USER_SERVICE_TIMEOUT_MS: z.coerce.number().default(3000).optional(),
  AUTH_USER_SERVICE_RETRIES: z.coerce.number().default(2).optional(),
  AUTH_USER_SERVICE_VALIDATE_PATH: z.string().default('/internal/users/validate').optional(),
  AUTH_USER_SERVICE_API_KEY: z.string().optional(),
  // OTEL
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().optional(),
  // Tests/flags
  SKIP_DB_TESTS: z.enum(['0','1']).default('0').optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Desactivamos la coerción automática: el esquema ya usa z.coerce donde aplica
  // y mantenemos enums string como 'true'/'false' o '0'/'1' sin convertirlos.
  const parsed = parseEnvironment(EnvSchema, { source, coerce: false });
  // Validaciones de seguridad en producción (fail-fast)
  if (parsed.NODE_ENV === 'production') {
    if (!parsed.AUTH_ADMIN_API_KEY || !parsed.AUTH_ADMIN_API_KEY.trim()) {
      throw new Error('AUTH_ADMIN_API_KEY es obligatorio en producción');
    }
    if (parsed.AUTH_USER_SERVICE_MODE === 'mock') {
      throw new Error('AUTH_USER_SERVICE_MODE=mock no está permitido en producción');
    }
    if (
      parsed.AUTH_USER_SERVICE_MODE === 'http' &&
      (!parsed.AUTH_USER_SERVICE_URL || !parsed.AUTH_USER_SERVICE_URL.trim())
    ) {
      throw new Error('AUTH_USER_SERVICE_URL es obligatorio cuando AUTH_USER_SERVICE_MODE=http en producción');
    }
  }
  return parsed;
}
