/**
 * Jest Setup Unificado - SmartEdify Testing Infrastructure
 * ========================================================
 * Configuración común para todos los tests del proyecto
 */

import 'dotenv/config';
import { join } from 'path';
import { existsSync } from 'fs';

// Cargar configuración de test del directorio raíz
const rootEnvTest = join(__dirname, '../.env.test');
if (existsSync(rootEnvTest)) {
  require('dotenv').config({ path: rootEnvTest });
}

// Forzar entorno de test
process.env.NODE_ENV = 'test';

// Configuración unificada de timeouts
jest.setTimeout(15000);

// Silenciar logs por defecto (activar con TEST_VERBOSE=1)
if (!process.env.TEST_VERBOSE) {
  // Silenciar console.log pero mantener console.error para debugging
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    if (process.env.DEBUG_AUTH || args[0]?.includes('[ERROR]')) {
      originalLog(...args);
    }
  };
}

// Configuración global de OpenTelemetry
process.env.OTEL_SDK_DISABLED = 'true';

// Cleanup global después de todos los tests
afterAll(async () => {
  // Dar tiempo a OpenTelemetry para finalizar
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Limpiar handles abiertos
  if (process.env.NODE_ENV === 'test') {
    // Force close any remaining connections
    process.emit('SIGTERM', 'SIGTERM');
  }
});

export default {};