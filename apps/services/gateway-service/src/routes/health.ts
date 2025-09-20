import { Router, Request, Response } from 'express';
import { HealthStatus, ServiceHealth } from '../types/auth';
import { services } from '../config/services';

const router = Router();

// In-memory health status cache
const healthCache = new Map<string, ServiceHealth>();
const startTime = Date.now();

// Check individual service health
async function checkServiceHealth(serviceName: string, serviceUrl: string): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${serviceUrl}/health`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SmartEdify-Gateway/1.0',
        'X-Health-Check': 'true'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const health: ServiceHealth = {
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
    };
    
    if (!response.ok) {
      health.error = `HTTP ${response.status}: ${response.statusText}`;
    }
    
    healthCache.set(serviceName, health);
    return health;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const health: ServiceHealth = {
      status: 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    healthCache.set(serviceName, health);
    return health;
  }
}

// Readiness check - simple endpoint that returns ready status
router.get('/ready', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime
  });
});

// Liveness check - simple endpoint that returns alive status
router.get('/live', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime
  });
});

// Gateway health endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const serviceHealthPromises = Object.entries(services).map(async ([key, service]) => {
      const health = await checkServiceHealth(key, service.url);
      return [key, health];
    });
    
    const serviceHealthResults = await Promise.all(serviceHealthPromises);
    const serviceHealthMap = Object.fromEntries(serviceHealthResults);
    
    const allHealthy = Object.values(serviceHealthMap).every((health) => (health as ServiceHealth).status === 'healthy');
    
    const healthStatus: HealthStatus = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      services: serviceHealthMap
    };
    
    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      error: 'Health check failed',
      services: {}
    });
  }
});

// Individual service health
router.get('/:service', async (req: Request, res: Response): Promise<void> => {
  const serviceName = req.params.service;
  const service = services[serviceName];
  
  if (!service) {
    res.status(404).json({
      error: 'Service not found',
      service: serviceName
    });
    return;
  }
  
  try {
    const health = await checkServiceHealth(serviceName, service.url);
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Readiness probe
router.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime
  });
});

// Liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime
  });
});

export default router;