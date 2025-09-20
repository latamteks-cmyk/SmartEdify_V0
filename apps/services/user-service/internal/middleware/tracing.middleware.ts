import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface TracingRequest extends Request {
  tracing?: {
    requestId: string;
    correlationId: string;
    startTime: number;
    service: string;
    operation: string;
  };
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  service: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error';
  tags: Record<string, any>;
  logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    fields?: Record<string, any>;
  }>;
}

// Simple in-memory trace store (in production, this would be sent to a tracing backend)
const traceStore = new Map<string, TraceSpan>();

export function tracingMiddleware(req: TracingRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Extract or generate correlation IDs
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  const correlationId = req.headers['x-correlation-id'] as string || requestId;
  const parentSpanId = req.headers['x-parent-span-id'] as string;
  
  // Create trace span
  const spanId = uuidv4();
  const operationName = `${req.method} ${req.route?.path || req.path}`;
  
  const span: TraceSpan = {
    traceId: correlationId,
    spanId,
    parentSpanId,
    operationName,
    service: 'user-service',
    startTime,
    status: 'success',
    tags: {
      'http.method': req.method,
      'http.url': req.url,
      'http.path': req.path,
      'user.agent': req.headers['user-agent'],
      'user.id': (req as any).user?.id,
    },
    logs: []
  };

  // Add tracing context to request
  req.tracing = {
    requestId,
    correlationId,
    startTime,
    service: 'user-service',
    operation: operationName
  };

  // Set response headers for downstream services
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-span-id', spanId);

  // Log request start
  console.log(`[TRACE] ${correlationId} - ${operationName} started`, {
    requestId,
    correlationId,
    spanId,
    parentSpanId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id
  });

  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(body: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Update span
    span.endTime = endTime;
    span.duration = duration;
    span.status = res.statusCode >= 400 ? 'error' : 'success';
    span.tags['http.status_code'] = res.statusCode;
    span.tags['response.size'] = JSON.stringify(body).length;

    // Add response log
    span.logs.push({
      timestamp: endTime,
      level: res.statusCode >= 400 ? 'error' : 'info',
      message: `Request completed with status ${res.statusCode}`,
      fields: {
        statusCode: res.statusCode,
        duration,
        responseSize: span.tags['response.size']
      }
    });

    // Store span
    traceStore.set(spanId, span);

    // Log request completion
    console.log(`[TRACE] ${correlationId} - ${operationName} completed`, {
      requestId,
      correlationId,
      spanId,
      duration,
      statusCode: res.statusCode,
      success: res.statusCode < 400
    });

    return originalJson.call(this, body);
  };

  // Handle errors
  const originalSend = res.send;
  res.send = function(body: any) {
    if (!span.endTime) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      span.endTime = endTime;
      span.duration = duration;
      span.status = res.statusCode >= 400 ? 'error' : 'success';
      span.tags['http.status_code'] = res.statusCode;

      span.logs.push({
        timestamp: endTime,
        level: res.statusCode >= 400 ? 'error' : 'info',
        message: `Request completed with status ${res.statusCode}`,
        fields: {
          statusCode: res.statusCode,
          duration
        }
      });

      traceStore.set(spanId, span);

      console.log(`[TRACE] ${correlationId} - ${operationName} completed`, {
        requestId,
        correlationId,
        spanId,
        duration,
        statusCode: res.statusCode,
        success: res.statusCode < 400
      });
    }

    return originalSend.call(this, body);
  };

  next();
}

// Helper function to add custom logs to current span
export function addTraceLog(req: TracingRequest, level: 'info' | 'warn' | 'error', message: string, fields?: Record<string, any>) {
  if (!req.tracing) return;

  console.log(`[TRACE] ${req.tracing.correlationId} - ${level.toUpperCase()}: ${message}`, {
    requestId: req.tracing.requestId,
    correlationId: req.tracing.correlationId,
    service: req.tracing.service,
    operation: req.tracing.operation,
    ...fields
  });
}

// Helper function to create child spans for database operations
export function createChildSpan(req: TracingRequest, operationName: string, tags?: Record<string, any>): string {
  if (!req.tracing) return uuidv4();

  const childSpanId = uuidv4();
  const startTime = Date.now();

  const childSpan: TraceSpan = {
    traceId: req.tracing.correlationId,
    spanId: childSpanId,
    parentSpanId: req.headers['x-span-id'] as string,
    operationName,
    service: 'user-service',
    startTime,
    status: 'success',
    tags: {
      'component': 'database',
      ...tags
    },
    logs: []
  };

  console.log(`[TRACE] ${req.tracing.correlationId} - Child span ${operationName} started`, {
    requestId: req.tracing.requestId,
    correlationId: req.tracing.correlationId,
    spanId: childSpanId,
    parentSpanId: childSpan.parentSpanId,
    operation: operationName
  });

  return childSpanId;
}

// Helper function to finish child spans
export function finishChildSpan(req: TracingRequest, spanId: string, status: 'success' | 'error', tags?: Record<string, any>) {
  if (!req.tracing) return;

  const endTime = Date.now();
  const span = traceStore.get(spanId);
  
  if (span) {
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = status;
    span.tags = { ...span.tags, ...tags };

    span.logs.push({
      timestamp: endTime,
      level: status === 'error' ? 'error' : 'info',
      message: `Child span ${span.operationName} completed`,
      fields: {
        duration: span.duration,
        status,
        ...tags
      }
    });

    traceStore.set(spanId, span);

    console.log(`[TRACE] ${req.tracing.correlationId} - Child span ${span.operationName} completed`, {
      requestId: req.tracing.requestId,
      correlationId: req.tracing.correlationId,
      spanId,
      duration: span.duration,
      status
    });
  }
}

// Function to get trace data (for debugging/monitoring)
export function getTraceData(traceId: string): TraceSpan[] {
  const spans: TraceSpan[] = [];
  for (const span of traceStore.values()) {
    if (span.traceId === traceId) {
      spans.push(span);
    }
  }
  return spans.sort((a, b) => a.startTime - b.startTime);
}

// Function to clear old traces (should be called periodically)
export function cleanupTraces(maxAgeMs: number = 3600000) { // 1 hour default
  const cutoff = Date.now() - maxAgeMs;
  for (const [spanId, span] of traceStore.entries()) {
    if (span.startTime < cutoff) {
      traceStore.delete(spanId);
    }
  }
}

// Endpoint to get trace information
export function getTraceEndpoint(req: TracingRequest, res: Response) {
  const traceId = req.params.traceId || req.query.traceId as string;
  
  if (!traceId) {
    return res.status(400).json({ error: 'traceId parameter required' });
  }

  const spans = getTraceData(traceId);
  
  if (spans.length === 0) {
    return res.status(404).json({ error: 'Trace not found' });
  }

  return res.json({
    traceId,
    spans,
    summary: {
      totalSpans: spans.length,
      totalDuration: Math.max(...spans.map(s => (s.endTime || Date.now()) - s.startTime)),
      services: [...new Set(spans.map(s => s.service))],
      operations: [...new Set(spans.map(s => s.operationName))],
      errors: spans.filter(s => s.status === 'error').length
    }
  });
}