import { Router } from 'express';
import healthRoutes from './health';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { createServiceProxy } from '../middleware/proxy';

const router = Router();

// Health routes (no auth required)
router.use('/health', healthRoutes);

// Auth service routes (public + protected)
router.use('/auth/register', createServiceProxy('auth'));
router.use('/auth/login', createServiceProxy('auth'));
router.use('/auth/forgot-password', createServiceProxy('auth'));
router.use('/auth/reset-password', createServiceProxy('auth'));
router.use('/auth/.well-known', createServiceProxy('auth'));

// Protected auth routes
router.use('/auth/logout', authenticateJWT, createServiceProxy('auth'));
router.use('/auth/refresh-token', authenticateJWT, createServiceProxy('auth'));
router.use('/auth/userinfo', authenticateJWT, createServiceProxy('auth'));

// Admin auth routes
router.use('/auth/admin', authenticateJWT, requireRole('admin'), createServiceProxy('auth'));

// User service routes (all protected)
router.use('/api/users', authenticateJWT, createServiceProxy('user'));

// Profile routes (self-service)
router.use('/api/profile', authenticateJWT, createServiceProxy('user'));
router.use('/api/preferences', authenticateJWT, createServiceProxy('user'));

// Tenant service routes (protected)
router.use('/api/tenants', authenticateJWT, createServiceProxy('tenant'));

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