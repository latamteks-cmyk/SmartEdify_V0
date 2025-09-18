import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import redis, { incr, ttl as redisTtl, expire as redisExpire } from '../adapters/redis/redis.adapter';

// Rate limiting simple en memoria + refuerzo con Redis para brute force por email
export const loginRateLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_LOGIN_WINDOW_MS || 60_000),
  max: Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login, espera e inténtalo de nuevo' }
});

export const adminRateLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_ADMIN_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.AUTH_ADMIN_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'admin_rate_limited' }
});

// Middleware brute force: cuenta intentos por combinación email+ip
export async function bruteForceGuard(req: Request, res: Response, next: Function) {
  if (req.path !== '/login' || req.method !== 'POST') return next();
  const email = (req.body && req.body.email) || 'unknown';
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const key = `bf:${email}:${ip}`;
  const attempts = await incr(key);
  const ttlSeconds = await redisTtl(key);
  if (attempts === 1) {
    await redisExpire(key, Number(process.env.AUTH_BRUTE_WINDOW_SEC || 300));
  }
  const limit = Number(process.env.AUTH_BRUTE_MAX_ATTEMPTS || 20);
  if (attempts > limit) {
    return res.status(429).json({ error: 'Cuenta temporalmente bloqueada', retry_in_s: ttlSeconds });
  }
  (req as any).bruteAttempts = attempts;
  next();
}
