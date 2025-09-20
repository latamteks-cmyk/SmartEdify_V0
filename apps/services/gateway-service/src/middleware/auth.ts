import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { JWTPayload, AuthenticatedRequest } from '../types/auth';
import { config } from '../config/env';

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ 
      error: 'Missing or invalid authorization header',
      code: 'MISSING_TOKEN'
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // For now, we'll use a simple secret. In production, this should fetch public keys from JWKS
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      tenant_id: decoded.tenant_id,
      roles: decoded.roles || []
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      res.status(500).json({ 
        error: 'Token validation failed',
        code: 'TOKEN_VALIDATION_ERROR'
      });
    }
  }
}

// Optional authentication - doesn't fail if no token provided
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(); // Continue without authentication
    return;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      tenant_id: decoded.tenant_id,
      roles: decoded.roles || []
    };
  } catch (error) {
    // Ignore token errors for optional auth
    console.warn('Optional auth token validation failed:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  next();
}

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