import { Router, type RequestHandler } from 'express';
import healthRoutes from './health';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { createServiceProxy } from '../middleware/proxy';
import { authRateLimit, generalRateLimit, readRateLimit } from '../middleware/rate-limit';

const router = Router();

// Health routes (no auth required)
router.use('/health', healthRoutes);

// Auth service routes (public + protected)
router.use('/auth/register', authRateLimit as unknown as RequestHandler, createServiceProxy('auth'));
router.use('/auth/login', authRateLimit as unknown as RequestHandler, createServiceProxy('auth'));
router.use('/auth/forgot-password', authRateLimit as unknown as RequestHandler, createServiceProxy('auth'));
router.use('/auth/reset-password', authRateLimit as unknown as RequestHandler, createServiceProxy('auth'));
router.use('/auth/.well-known', readRateLimit as unknown as RequestHandler, createServiceProxy('auth'));

// OAuth 2.0/OpenID Connect proxy routes
router.use('/oauth/authorize', authRateLimit as unknown as RequestHandler, createServiceProxy('auth'));
router.use('/oauth/token', authRateLimit as unknown as RequestHandler, createServiceProxy('auth'));
router.use('/oauth/introspect', authRateLimit as unknown as RequestHandler, createServiceProxy('auth'));
router.use('/oauth/revoke', authRateLimit as unknown as RequestHandler, createServiceProxy('auth'));
router.use('/oauth/userinfo', readRateLimit as unknown as RequestHandler, authenticateJWT, createServiceProxy('auth'));

// Protected auth routes
router.use('/auth/logout', authRateLimit as unknown as RequestHandler, authenticateJWT, createServiceProxy('auth'));
router.use('/auth/refresh-token', authRateLimit as unknown as RequestHandler, authenticateJWT, createServiceProxy('auth'));
router.use('/auth/userinfo', readRateLimit as unknown as RequestHandler, authenticateJWT, createServiceProxy('auth'));

// Admin auth routes
router.use('/auth/admin', generalRateLimit as unknown as RequestHandler, authenticateJWT, requireRole('admin'), createServiceProxy('auth'));

// User service routes (all protected)
router.use('/api/users', generalRateLimit as unknown as RequestHandler, authenticateJWT, createServiceProxy('user'));

// Profile routes (self-service)
router.use('/api/profile', generalRateLimit as unknown as RequestHandler, authenticateJWT, createServiceProxy('user'));
router.use('/api/preferences', generalRateLimit as unknown as RequestHandler, authenticateJWT, createServiceProxy('user'));

// Tenant service routes (protected)
router.use('/api/tenants', generalRateLimit as unknown as RequestHandler, authenticateJWT, createServiceProxy('tenant'));

// Catch-all for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    code: 'ROUTE_NOT_FOUND'
  });
});

export default router;
