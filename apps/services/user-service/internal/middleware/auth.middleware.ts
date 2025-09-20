import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenant_id?: string;
    roles?: string[];
  };
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  tenant_id?: string;
  roles?: string[];
  iat: number;
  exp: number;
}

// Simple JWT validation middleware
// In production, this should validate against JWKS from Auth Service
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // For now, we'll use a simple secret. In production, this should fetch public keys from Auth Service
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      tenant_id: decoded.tenant_id,
      roles: decoded.roles || []
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    } else {
      return res.status(500).json({ error: 'Token validation failed' });
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
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
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
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.user.roles?.includes(role)) {
      return res.status(403).json({ error: `Role '${role}' required` });
    }
    
    next();
  };
}

// Check if user can access their own resource or has admin role
export function requireOwnershipOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const resourceUserId = req.params.id;
  const isOwner = req.user.id === resourceUserId;
  const isAdmin = req.user.roles?.includes('admin');
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
}