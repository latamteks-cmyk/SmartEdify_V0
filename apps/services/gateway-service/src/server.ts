import express from 'express';
import helmet from 'helmet';
import { config } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { loggingMiddleware, requestIdMiddleware } from './middleware/logging';
import { tracingMiddleware } from './middleware/tracing';
import { initializeTracing } from './config/tracing';
import routes from './routes/index';
import { services } from './config/services';

const app = express();

// Initialize tracing
initializeTracing().catch(err => {
  console.error('Failed to initialize tracing:', err);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Request processing middleware
app.use(requestIdMiddleware);
app.use(tracingMiddleware);
app.use(loggingMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting will be applied per route as needed

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

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