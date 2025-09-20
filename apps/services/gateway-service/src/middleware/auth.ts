import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JWTPayload, AuthenticatedRequest } from '@/types/auth.js';
import { config } from '@/config/env.js';

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Missing or invalid authorization header',
      code: 'MISSING_TOKEN'
    });
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
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      return res.status(500).json({ 
        error: 'Token validation failed',
        code: 'TOKEN_VALIDATION_ERROR'
      });
    }
  }
}

// Optional authentication - doesn't fail if no token provided
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without authentication
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
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!req.user.roles?.includes(role)) {
      return res.status(403).json({ 
        error: `Role '${role}' required`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
}

// Check if user can access tenant resources
export function requireTenantAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  const requestedTenantId = req.headers['x-tenant-id'] as string || req.params.tenantId;
  
  if (!requestedTenantId) {
    return res.status(400).json({ 
      error: 'Tenant ID required',
      code: 'TENANT_ID_REQUIRED'
    });
  }
  
  // Admin users can access any tenant
  if (req.user.roles?.includes('admin')) {
    return next();
  }
  
  // Regular users can only access their own tenant
  if (req.user.tenant_id !== requestedTenantId) {
    return res.status(403).json({ 
      error: 'Access denied to this tenant',
      code: 'TENANT_ACCESS_DENIED'
    });
  }
  
  next();
}