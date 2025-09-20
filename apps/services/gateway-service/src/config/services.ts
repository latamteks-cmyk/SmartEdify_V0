import { config } from './env.js';

export interface ServiceConfig {
  name: string;
  url: string;
  path: string;
  timeout: number;
  retries: number;
}

export const services: Record<string, ServiceConfig> = {
  auth: {
    name: 'auth-service',
    url: config.AUTH_SERVICE_URL,
    path: '/auth',
    timeout: 5000,
    retries: 3,
  },
  user: {
    name: 'user-service',
    url: config.USER_SERVICE_URL,
    path: '/api/users',
    timeout: 5000,
    retries: 3,
  },
  tenant: {
    name: 'tenant-service',
    url: config.TENANT_SERVICE_URL,
    path: '/api/tenants',
    timeout: 5000,
    retries: 3,
  },
};

export const getServiceByPath = (path: string): ServiceConfig | null => {
  for (const service of Object.values(services)) {
    if (path.startsWith(service.path)) {
      return service;
    }
  }
  return null;
};