import { trace, context } from '@opentelemetry/api';

// Simple test to verify tracing functionality
async function testTracing() {
  try {
    // Get the tracer
    const tracer = trace.getTracer('gateway-service-test');
    
    // Create a test span
    const span = tracer.startSpan('test-span');
    
    // Add some attributes
    span.setAttribute('test.attribute', 'test-value');
    span.setAttribute('service.name', 'gateway-service');
    
    // End the span
    span.end();
    
    console.log('✅ Tracing functionality test completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Tracing functionality test failed:', error);
    return false;
  }
}

// Run the test
testTracing().then(success => {
  process.exit(success ? 0 : 1);
});