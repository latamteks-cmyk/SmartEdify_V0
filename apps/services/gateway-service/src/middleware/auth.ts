import { Response, NextFunction } from 'express';
import { validateJWT, optionalJWT } from './jwt-validator';
import { JWTPayload, AuthenticatedRequest } from '../types/auth';
import { config } from '../config/env';

export { validateJWT as authenticateJWT };
export { optionalJWT as optionalAuth };

// Authorization middleware - checks if user has required role
export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }
    
    if (!req.user.roles?.includes(role)) {
      res.status(403).json({ 
        error: `Role '${role}' required`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }
    
    next();
  };
}

// Check if user can access tenant resources
export function requireTenantAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
      });
    return;
  }
  
  const requestedTenantId = req.get('x-tenant-id') || req.params.tenantId;
  
  if (!requestedTenantId) {
    res.status(400).json({ 
      error: 'Tenant ID required',
      code: 'TENANT_ID_REQUIRED'
    });
    return;
  }
  
  // Admin users can access any tenant
  if (req.user.roles?.includes('admin')) {
    next();
    return;
  }
  
  // Regular users can only access their own tenant
  if (req.user.tenant_id !== requestedTenantId) {
    res.status(403).json({ 
      error: 'Access denied to this tenant',
      code: 'TENANT_ACCESS_DENIED'
    });
    return;
  }
  
  next();
}