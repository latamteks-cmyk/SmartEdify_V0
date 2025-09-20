import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import { services, getServiceByPath } from '@/config/services.js';
import { AuthenticatedRequest } from '@/types/auth.js';

// Create proxy middleware for each service
export const createServiceProxy = (serviceName: string) => {
  const service = services[serviceName];
  
  if (!service) {
    throw new Error(`Service ${serviceName} not found`);
  }

  const proxyOptions: Options = {
    target: service.url,
    changeOrigin: true,
    timeout: service.timeout,
    pathRewrite: {
      [`^${service.path}`]: '', // Remove the gateway path prefix
    },
    onProxyReq: (proxyReq, req: AuthenticatedRequest, res) => {
      // Add user context headers for backend services
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email);
        if (req.user.tenant_id) {
          proxyReq.setHeader('X-Tenant-ID', req.user.tenant_id);
        }
        if (req.user.roles && req.user.roles.length > 0) {
          proxyReq.setHeader('X-User-Roles', req.user.roles.join(','));
        }
      }
      
      // Forward request ID
      const requestId = req.headers['x-request-id'];
      if (requestId) {
        proxyReq.setHeader('X-Request-ID', requestId as string);
      }
      
      // Add gateway identifier
      proxyReq.setHeader('X-Gateway-Source', 'smartedify-gateway');
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add CORS headers if needed
      proxyRes.headers['Access-Control-Allow-Origin'] = res.getHeader('Access-Control-Allow-Origin') as string;
      proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
      
      // Forward request ID in response
      const requestId = req.headers['x-request-id'];
      if (requestId) {
        proxyRes.headers['X-Request-ID'] = requestId as string;
      }
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${service.name}:`, err.message);
      
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Service temporarily unavailable',
          service: service.name,
          code: 'SERVICE_UNAVAILABLE'
        });
      }
    },
    logLevel: 'warn',
  };

  return createProxyMiddleware(proxyOptions);
};

// Dynamic proxy middleware that routes based on path
export const dynamicProxy = (req: Request, res: Response, next: Function) => {
  const service = getServiceByPath(req.path);
  
  if (!service) {
    return res.status(404).json({
      error: 'Service not found',
      path: req.path,
      code: 'SERVICE_NOT_FOUND'
    });
  }
  
  // Create proxy middleware on-the-fly
  const proxy = createServiceProxy(service.name.replace('-service', ''));
  proxy(req, res, next);
};

// Health check proxy for services
export const createHealthCheckProxy = (serviceName: string) => {
  const service = services[serviceName];
  
  return createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    pathRewrite: {
      '^/health/.*': '/health',
    },
    timeout: 3000, // Shorter timeout for health checks
    onError: (err, req, res) => {
      if (!res.headersSent) {
        res.status(503).json({
          status: 'unhealthy',
          service: service.name,
          error: err.message
        });
      }
    },
  });
};