import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { rateLimitHitCounter } from '../observability/metrics';

// General rate limiting
export const generalRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address and user ID if available for more granular limiting
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;
    return userId ? `${ip}:${userId}` : ip;
  },
  handler: (req, res, _next, options) => {
    try { rateLimitHitCounter.labels({ route: req.path }).inc(); } catch {}
    res.status(options.statusCode || 429).json(options.message);
  },
});

// Strict rate limiting for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900, // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res, _next, options) => {
    try { rateLimitHitCounter.labels({ route: req.path }).inc(); } catch {}
    res.status(options.statusCode || 429).json(options.message);
  },
});

// Lenient rate limiting for read operations
export const readRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many read requests, please try again later.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    try { rateLimitHitCounter.labels({ route: req.path }).inc(); } catch {}
    res.status(options.statusCode || 429).json(options.message);
  },
});
