export interface JWTPayload {
  sub: string; // user id
  email: string;
  tenant_id?: string;
  roles?: string[];
  iat: number;
  exp: number;
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenant_id?: string;
    roles?: string[];
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: Record<string, ServiceHealth>;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}