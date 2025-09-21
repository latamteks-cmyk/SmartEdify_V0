import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, JWTPayload } from '../types/auth';
import { config } from '../config/env';

// Create a remote JWKS set that will fetch keys from the Auth Service
const JWKS = createRemoteJWKSet(new URL(config.JWKS_URL));

/**
 * Middleware to validate JWT tokens using remote JWKS from Auth Service
 */
export async function validateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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
    // Validate the token against the remote JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: config.ISSUER,
      audience: config.AUDIENCE
    });
    
    req.user = {
      id: payload.sub!,
      email: payload.email as string,
      tenant_id: payload.tenant_id as string,
      roles: (payload.roles as string[]) || []
    };
    
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof Error) {
      if (error.name === 'JWTExpired') {
        res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }
      
      if (error.name === 'JWSSignatureVerificationFailed') {
        res.status(401).json({ 
          error: 'Invalid token signature',
          code: 'INVALID_TOKEN_SIGNATURE'
        });
        return;
      }
      
      res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        details: error.message
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Token validation failed',
      code: 'TOKEN_VALIDATION_ERROR'
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export async function optionalJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(); // Continue without authentication
    return;
  }

  const token = authHeader.substring(7);
  
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: config.ISSUER,
      audience: config.AUDIENCE
    });
    
    req.user = {
      id: payload.sub!,
      email: payload.email as string,
      tenant_id: payload.tenant_id as string,
      roles: (payload.roles as string[]) || []
    };
  } catch (error) {
    // Ignore token errors for optional auth
    console.warn('Optional auth token validation failed:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  next();
}