// Forzar mock global de pg.adapter para todos los tests (con extensión .ts para máxima coincidencia)
jest.mock('../internal/adapters/db/pg.adapter.ts');
// Setup global para tests.
// Aquí podríamos ejecutar migraciones si fuera necesario.
import * as pgAdapter from '../internal/adapters/db/pg.adapter';
import redis from '../internal/adapters/redis/redis.adapter';

afterAll(async () => {
	try { await pgAdapter.default.pool.end(); } catch {}
	try { await (redis as any).quit?.(); } catch {}
});
