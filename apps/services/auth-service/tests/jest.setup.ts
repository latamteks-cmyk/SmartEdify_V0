// Forzar NODE_ENV test
process.env.NODE_ENV = 'test';

// Mock ligero de OpenTelemetry NodeSDK para evitar timers / sockets en tests
jest.mock('@opentelemetry/sdk-node', () => {
	return {
		NodeSDK: class {
			async start() { /* noop */ }
			async shutdown() { /* noop */ }
		}
	};
});

// Limpieza de handles abiertos tras todas las suites
afterAll(async () => {
	try {
		// Apagar tracing si se inicializó
		const tracing = require('../cmd/server/main');
		if (tracing && typeof tracing.shutdownTracing === 'function') {
			await tracing.shutdownTracing();
		}
	} catch {}
	try {
		// Limpiar métricas para evitar timers internos
		const prom = require('prom-client');
		if (prom && prom.register) {
			prom.register.clear();
		}
	} catch {}
	try {
		// Cerrar redis mock si expone quit (el mock puede no implementarlo)
		const redis = require('../internal/adapters/redis/redis.adapter').default;
		if (redis && typeof redis.quit === 'function') {
			await redis.quit();
		}
	} catch {}
	try {
		// Cerrar pool de Postgres para evitar open handles
		const { endPool } = require('../internal/adapters/db/pg.adapter');
		if (endPool) await endPool();
	} catch {}
});
