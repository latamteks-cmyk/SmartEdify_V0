import morgan from 'morgan';
import { Request, Response } from 'express';
import { config } from '@/config/env.js';

// Custom token for request ID
morgan.token('request-id', (req: Request) => {
  return req.headers['x-request-id'] as string || 'unknown';
});

// Custom token for user ID
morgan.token('user-id', (req: Request) => {
  return (req as any).user?.id || 'anonymous';
});

// Custom token for tenant ID
morgan.token('tenant-id', (req: Request) => {
  return (req as any).user?.tenant_id || req.headers['x-tenant-id'] as string || 'unknown';
});

// Custom format for structured logging
const logFormat = config.NODE_ENV === 'production'
  ? ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :request-id :tenant-id :response-time ms'
  : ':method :url :status :response-time ms - :request-id';

export const loggingMiddleware = morgan(logFormat, {
  skip: (req: Request, res: Response) => {
    // Skip logging for health checks in production
    if (config.NODE_ENV === 'production' && req.path === '/health') {
      return true;
    }
    return false;
  },
});

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: Function) => {
  const requestId = req.headers['x-request-id'] as string || 
    `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};