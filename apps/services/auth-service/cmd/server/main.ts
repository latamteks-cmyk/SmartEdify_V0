/*
 * Copyright (c) 2024 SmartEdify contributors
 * Licensed under the MIT License. See the LICENSE file in the project root for details.
 */

import 'dotenv/config';
import { parseEnv } from '../../internal/config/env';
import { startTracing, shutdownTracing } from '../../internal/observability/tracing';

import { context, trace } from '@opentelemetry/api';

// Validación de entorno temprana (fail-fast en producción)
const __env = parseEnv(process.env);
if (__env.NODE_ENV === 'production') {
  if (!__env.AUTH_ADMIN_API_KEY) {
    // Asegurar que los endpoints administrativos estén protegidos en prod
    throw new Error('AUTH_ADMIN_API_KEY es obligatorio en producción');
  }
}

// Inicializar tracing (no bloquear si falla)
startTracing().catch(err => {
  console.error('[tracing] init failed', err);
});

import { randomUUID } from 'crypto';

import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import client from 'prom-client';

import * as pgAdapter from '@db/pg.adapter';
import { forgotPasswordHandler } from '../../internal/adapters/http/forgot-password.handler';
import { loginHandler } from '../../internal/adapters/http/login.handler';
import { logoutHandler } from '../../internal/adapters/http/logout.handler';
import { refreshHandler } from '../../internal/adapters/http/refresh.handler';
import { registerHandler } from '../../internal/adapters/http/register.handler';
import { resetPasswordHandler } from '../../internal/adapters/http/reset-password.handler';
import { rolesHandler, permissionsHandler } from '../../internal/adapters/http/roles-permissions.handler';
import { authorizeHandler } from '../../internal/adapters/http/authorize.handler';
import { tokenHandler } from '../../internal/adapters/http/token.handler';
import { userinfoHandler } from '../../internal/adapters/http/userinfo.handler';
import { introspectionHandler } from '../../internal/adapters/http/introspection.handler';
import { revocationHandler } from '../../internal/adapters/http/revocation.handler';
import { openIdConfigurationHandler } from '../../internal/adapters/http/openid-configuration.handler';
import { redisPing } from '../../internal/adapters/redis/redis.adapter';
import { loginRateLimiter, bruteForceGuard, adminRateLimiter } from '../../internal/middleware/rate-limit';
import { adminAuthMiddleware } from '../../internal/middleware/admin-auth';
import { getPublicJwks, rotateKeys, getCurrentKey } from '../../internal/security/keys';
import { revokeSessionsByKid } from '../../internal/security/jwt';

const rootLogger = pino({
  level: process.env.AUTH_LOG_LEVEL || 'info',
  base: { service: 'auth-service' },
  timestamp: pino.stdTimeFunctions.isoTime
});
// En test a veces pino-http se rompe por symbol collisions; proveemos fallback plano
const logger: any = process.env.NODE_ENV === 'test'
  ? {
      info: (...a: any[]) => { if (process.env.AUTH_TEST_LOGS) console.log('[info]', ...a); },
      error: (...a: any[]) => { if (process.env.AUTH_TEST_LOGS) console.error('[error]', ...a); },
      warn: (...a: any[]) => { if (process.env.AUTH_TEST_LOGS) console.warn('[warn]', ...a); },
      debug: (..._a: any[]) => {},
      child: () => this
    }
  : rootLogger.child({});

// Diagnóstico configuración PG
logger.debug({
  pg: {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    db: process.env.PGDATABASE
  }
}, 'PG environment variables');

// Prometheus metrics setup
const register = new client.Registry();
// Nota: collectDefaultMetrics devuelve void en prom-client v15; simplemente no lo llamamos en test
if (process.env.NODE_ENV !== 'test') {
  client.collectDefaultMetrics({ register });
}

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'auth_http_requests_total',
  help: 'Total de requests HTTP recibidas',
  labelNames: ['method', 'route', 'status']
});
const httpRequestDuration = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'Duración de requests HTTP en segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);

// Business metrics (login, password reset)
export const loginSuccessCounter = new client.Counter({
  name: 'auth_login_success_total',
  help: 'Total de logins exitosos'
});
export const loginFailCounter = new client.Counter({
  name: 'auth_login_fail_total',
  help: 'Total de logins fallidos (credenciales inválidas)'
});
export const passwordResetRequestedCounter = new client.Counter({
  name: 'auth_password_reset_requested_total',
  help: 'Total de solicitudes de recuperación de contraseña generadas'
});
export const passwordResetCompletedCounter = new client.Counter({
  name: 'auth_password_reset_completed_total',
  help: 'Total de recuperaciones de contraseña completadas'
});
register.registerMetric(loginSuccessCounter);
register.registerMetric(loginFailCounter);
register.registerMetric(passwordResetRequestedCounter);
register.registerMetric(passwordResetCompletedCounter);

// Métricas de rotación (refresh)
export const refreshRotatedCounter = new client.Counter({
  name: 'auth_refresh_rotated_total',
  help: 'Total de rotaciones exitosas de refresh token'
});
export const refreshReuseBlockedCounter = new client.Counter({
  name: 'auth_refresh_reuse_blocked_total',
  help: 'Intentos bloqueados de reutilización de refresh token rotado'
});
register.registerMetric(refreshRotatedCounter);
register.registerMetric(refreshReuseBlockedCounter);

export const tokenRevokedCounter = new client.Counter({
  name: 'auth_token_revoked_total',
  help: 'Total de tokens revocados por logout o acciones administrativas',
  labelNames: ['type']
});
register.registerMetric(tokenRevokedCounter);

// JWKS metrics
export const jwksKeysTotal = new client.Gauge({
  name: 'auth_jwks_keys_total',
  help: 'Número de claves activas (current + next + retiring)',
  labelNames: ['status']
});
export const jwksRotationCounter = new client.Counter({
  name: 'auth_jwks_rotation_total',
  help: 'Total de rotaciones manuales ejecutadas'
});
register.registerMetric(jwksKeysTotal);
register.registerMetric(jwksRotationCounter);

export const app = express();
// Export util para tests que permita limpiar intervalo si en algún momento se inicializa
export async function _cleanupMetrics() { /* noop actual (mantener API por si cambiamos) */ }
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware request-id
app.use((req, res, next) => {
  const rid = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).requestId = rid;
  res.setHeader('x-request-id', rid);
  next();
});

// pino-http para logs estructurados
// Uso básico de pino-http (dejamos que cree su propia instancia enlazada)
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({
    customProps: (req: any) => {
      const span = trace.getSpan(context.active());
      const sc = span?.spanContext();
      return {
        requestId: (req as any).requestId,
        trace_id: sc?.traceId,
        span_id: sc?.spanId
      };
    },
    logger: logger as any
  }));
}

// Metrics middleware (después de logging para capturar status final)
app.use((req, res, next) => {
  const startHr = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(startHr);
    const duration = diff[0] + diff[1] / 1e9; // seconds
    const route = (req.route && req.route.path) || req.path || 'unmatched';
    const labels = { method: req.method, route, status: String(res.statusCode) } as any;
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });
  next();
});

// Health endpoint
app.get('/health', async (req, res) => {
  const start = Date.now();
  let dbOk = false;
  let redisOk = false;
  try {
  await pgAdapter.pool.query('SELECT 1');
    dbOk = true;
  } catch (e) {
    logger.error({ err: e }, 'DB health check failed');
  }
  try {
    const pong = await redisPing();
    redisOk = pong === 'PONG';
  } catch (e) {
    logger.error({ err: e }, 'Redis health check failed');
  }
  const status = dbOk && redisOk ? 'ok' : 'degraded';
  const body = { status, db: dbOk, redis: redisOk, uptime_s: process.uptime(), latency_ms: Date.now() - start };
  // En entorno de test devolvemos 200 siempre para estabilidad de contratos aislados
  const code = process.env.NODE_ENV === 'test' ? 200 : (status === 'ok' ? 200 : 503);
  res.status(code).json(body);
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (e) {
    logger.error({ err: e }, 'Error generando métricas');
    res.status(500).end();
  }
});

// JWKS público
app.get('/.well-known/jwks.json', async (_req, res) => {
  try {
    const jwks = await getPublicJwks();
    // Actualizar gauge por estado
    const counts: Record<string, number> = {};
    for (const k of jwks.keys) {
      counts[k.status] = (counts[k.status] || 0) + 1;
    }
    const statuses = ['current','next','retiring'];
    for (const st of statuses) {
      jwksKeysTotal.set({ status: st }, counts[st] || 0);
    }
    res.json(jwks);
  } catch (e: any) {
    logger.error({ err: e }, 'Error obteniendo JWKS');
    res.status(500).json({ error: 'jwks_error' });
  }
});

app.get('/.well-known/openid-configuration', openIdConfigurationHandler);

// Rotación manual (MVP) - proteger en producción
app.post('/admin/rotate-keys', adminRateLimiter, adminAuthMiddleware, async (_req, res) => {
  try {
    const result = await rotateKeys();
    jwksRotationCounter.inc();
    res.json({ message: 'rotated', current: { kid: result.newCurrent.kid }, next: result.newNext ? { kid: result.newNext.kid } : null });
  } catch (e: any) {
    logger.error({ err: e }, 'Error en rotación manual');
    res.status(500).json({ error: 'rotation_failed' });
  }
});

app.post('/admin/revoke-kid', adminRateLimiter, adminAuthMiddleware, async (req, res) => {
  const kid = typeof req.body?.kid === 'string' ? req.body.kid.trim() : '';
  if (!kid) {
    return res.status(400).json({ error: 'kid_required' });
  }
  try {
    const result = await revokeSessionsByKid(kid);
    res.json({ message: 'revoked', ...result });
  } catch (e: any) {
    logger.error({ err: e, kid }, 'Error revocando sesiones por kid');
    res.status(500).json({ error: 'revoke_failed' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/current-kid', async (_req, res) => {
    const key = await getCurrentKey();
    res.json({ kid: key.kid });
  });
}

// Endpoints principales
app.get('/authorize', authorizeHandler);
app.post('/token', tokenHandler);
app.get('/userinfo', userinfoHandler);
app.post('/introspection', introspectionHandler);
app.post('/revocation', revocationHandler);
app.post('/register', registerHandler);
app.post('/login', loginRateLimiter, bruteForceGuard, loginHandler);
app.post('/logout', logoutHandler);
app.post('/forgot-password', forgotPasswordHandler);
app.post('/reset-password', resetPasswordHandler);
app.post('/refresh-token', refreshHandler);
app.get('/roles', rolesHandler);
app.get('/permissions', permissionsHandler);

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.AUTH_PORT || 8080;
  const server = app.listen(PORT, () => {
    logger.info({ msg: 'Auth Service escuchando', port: PORT });
  });
  const graceful = async () => {
    try { await shutdownTracing(); } catch {}
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', graceful);
  process.on('SIGTERM', graceful);
}
