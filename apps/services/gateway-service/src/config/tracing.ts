import { initializeNodeTracing } from '@smartedify/shared/tracing';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { registerInstrumentations } from '@opentelemetry/instrumentations';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { config } from '../config/env';

// Enable diagnostics for development
if (config.NODE_ENV === 'development') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

/**
 * Initialize OpenTelemetry tracing for the Gateway Service
 */
export async function initializeTracing() {
  try {
    // Initialize tracing with the shared utility
    const { provider, shutdown } = initializeNodeTracing({
      serviceName: 'gateway-service',
      environment: config.NODE_ENV,
      resourceAttributes: {
        'service.version': process.env.npm_package_version || 'unknown'
      }
    });

    // Register auto-instrumentations
    registerInstrumentations({
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation to reduce noise
          '@opentelemetry/instrumentation-fs': {
            enabled: false
          }
        })
      ],
      tracerProvider: provider
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('Shutting down tracing...');
      await shutdown();
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    console.log('✅ Tracing initialized');
    return { provider, shutdown };
  } catch (error) {
    console.error('❌ Failed to initialize tracing:', error);
    throw error;
  }
}