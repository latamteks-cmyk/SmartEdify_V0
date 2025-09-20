import { Router } from 'express';
import healthRoutes from './health.js';
import { authenticateJWT, optionalAuth, requireRole } from '@/middleware/auth.js';
import { authRateLimit, readRateLimit, generalRateLimit } from '@/middleware/rate-limit.js';
import { createServiceProxy } from '@/middleware/proxy.js';

const router = Router();

// Health routes (no auth required)
router.use('/health', healthRoutes);

// Auth service routes (public + protected)
router.use('/auth/register', authRateLimit, createServiceProxy('auth'));
router.use('/auth/login', authRateLimit, createServiceProxy('auth'));
router.use('/auth/forgot-password', authRateLimit, createServiceProxy('auth'));
router.use('/auth/reset-password', authRateLimit, createServiceProxy('auth'));
router.use('/auth/.well-known', readRateLimit, createServiceProxy('auth'));

// Protected auth routes
router.use('/auth/logout', generalRateLimit, authenticateJWT, createServiceProxy('auth'));
router.use('/auth/refresh-token', generalRateLimit, authenticateJWT, createServiceProxy('auth'));
router.use('/auth/userinfo', readRateLimit, authenticateJWT, createServiceProxy('auth'));

// Admin auth routes
router.use('/auth/admin', generalRateLimit, authenticateJWT, requireRole('admin'), createServiceProxy('auth'));

// User service routes (all protected)
router.use('/api/users', generalRateLimit, authenticateJWT, createServiceProxy('user'));

// Profile routes (self-service)
router.use('/api/profile', generalRateLimit, authenticateJWT, createServiceProxy('user'));
router.use('/api/preferences', generalRateLimit, authenticateJWT, createServiceProxy('user'));

// Tenant service routes (protected)
router.use('/api/tenants', generalRateLimit, authenticateJWT, createServiceProxy('tenant'));

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