import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to create spans for incoming HTTP requests
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const tracer = trace.getTracer('gateway-service');
  
  // Extract parent span context from headers if present
  const parentContext = context.active();
  
  // Create a span for the incoming request
  const span = tracer.startSpan(`HTTP ${req.method}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.host': req.get('host') || '',
      'http.user_agent': req.get('user-agent') || '',
      'http.route': req.route?.path || req.path,
      'request.id': req.headers['x-request-id'] || ''
    }
  }, parentContext);
  
  // Add the span to the request context
  const spanContext = trace.setSpan(parentContext, span);
  
  // Set context for the request lifecycle
  res.locals.span = span;
  
  // Capture response details when the request finishes
  let ended = false;
  res.on('finish', () => {
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.status_text': res.statusMessage || ''
    });
    
    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    
    span.end();
    ended = true;
  });
  
  // Also end span on close (connection closed)
  res.on('close', () => {
    if (!ended) {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'error': 'Connection closed unexpectedly'
      });
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Connection closed unexpectedly'
      });
      span.end();
    }
  });
  
  // Continue with the request using the new context
  context.with(spanContext, next);
}
