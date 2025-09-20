import cors from 'cors';
import { config } from '../config/env';

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = config.CORS_ORIGIN.split(',').map(o => o.trim());
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (config.NODE_ENV === 'development' && allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: config.CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-Tenant-ID'
  ],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);