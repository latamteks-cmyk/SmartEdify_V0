import express, { Request, Response, NextFunction } from 'express';
import { Histogram, Counter, Registry, collectDefaultMetrics } from 'prom-client';
import { config } from '../config/env';

const registry = new Registry();
collectDefaultMetrics({ prefix: config.METRICS_PREFIX, register: registry });

// HTTP request metrics
export const httpRequestCounter = new Counter({
  name: `${config.METRICS_PREFIX}http_requests_total`,
  help: 'Total de requests HTTP recibidos',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: `${config.METRICS_PREFIX}http_request_duration_seconds`,
  help: 'Duración de requests HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Backend (proxied) request metrics
export const backendRequestCounter = new Counter({
  name: `${config.METRICS_PREFIX}backend_requests_total`,
  help: 'Total de requests a servicios backend',
  labelNames: ['service', 'method', 'status_code'] as const,
  registers: [registry],
});

export const backendRequestDuration = new Histogram({
  name: `${config.METRICS_PREFIX}backend_request_duration_seconds`,
  help: 'Duración de requests a servicios backend en segundos',
  labelNames: ['service', 'method', 'status_code'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Security-related metrics
export const authFailureCounter = new Counter({
  name: `${config.METRICS_PREFIX}auth_failures_total`,
  help: 'Total de fallos de autenticación',
  labelNames: ['reason'] as const,
  registers: [registry],
});

export const rateLimitHitCounter = new Counter({
  name: `${config.METRICS_PREFIX}rate_limit_hits_total`,
  help: 'Total de eventos de rate limiting',
  labelNames: ['route'] as const,
  registers: [registry],
});

// Middleware para medir métricas HTTP por solicitud
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!config.METRICS_ENABLED) return next();

  const method = req.method;
  const route = req.route?.path || req.path;
  const endTimer = httpRequestDuration.startTimer({ method, route });

  res.on('finish', () => {
    const status = res.statusCode.toString();
    httpRequestCounter.labels({ method, route, status_code: status }).inc();
    endTimer({ status_code: status });
  });

  next();
}

// Router para exponer /metrics
export const metricsRouter = express.Router();

metricsRouter.get(config.METRICS_ROUTE, async (_req: Request, res: Response) => {
  if (!config.METRICS_ENABLED) {
    res.status(404).json({ error: 'Metrics disabled' });
    return;
  }
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

export type BackendTimer = { end: (labels?: Record<string, string | number>) => void };

export function startBackendTimer(service: string, method: string): BackendTimer {
  const end = backendRequestDuration.startTimer({ service, method });
  return {
    end: (labels?: Record<string, string | number>) => end(labels)
  };
}
