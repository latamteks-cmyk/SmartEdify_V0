import express from 'express';
import helmet from 'helmet';
import { config } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { loggingMiddleware, requestIdMiddleware } from './middleware/logging';
import { tracingMiddleware } from './middleware/tracing';
import { initializeTracing } from './config/tracing';
import routes from './routes/index';
import { services } from './config/services';
import { httpMetricsMiddleware, metricsRouter } from './observability/metrics';

const app = express();

// Initialize tracing
initializeTracing().catch(err => {
  console.error('Failed to initialize tracing:', err);
});

// Security middleware
const helmetCspDirectives: any = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", ...(config.NODE_ENV === 'production' ? [] : ["'unsafe-inline'"])],
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https:'],
};

app.use(
  helmet({
    contentSecurityPolicy: { directives: helmetCspDirectives },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Request processing middleware
app.use(requestIdMiddleware);
app.use(tracingMiddleware);
app.use(httpMetricsMiddleware);
app.use(loggingMiddleware);
app.use(corsMiddleware);
// Ensure CORS headers are present even without Origin header
app.use((req, res, next) => {
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', config.CORS_ORIGIN.includes('*') ? '*' : config.CORS_ORIGIN.split(',')[0]);
  }
  if (!res.getHeader('Access-Control-Allow-Credentials')) {
    res.setHeader('Access-Control-Allow-Credentials', String(config.CORS_CREDENTIALS));
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting will be applied per route as needed

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Metrics route (before other routes to avoid interference)
app.use(metricsRouter);

// Routes
app.use('/', routes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id'],
    code: 'INTERNAL_ERROR'
  });
});

// Only start server if not in test environment
if (config.NODE_ENV !== 'test') {
  const server = app.listen(config.PORT, () => {
    console.log(`🚀 Gateway Service running on port ${config.PORT}`);
    console.log(`📊 Environment: ${config.NODE_ENV}`);
    console.log(`🔗 Services configured: ${Object.keys(services).join(', ')}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
}

export default app;
