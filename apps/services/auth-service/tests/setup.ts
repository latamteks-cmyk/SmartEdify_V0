// Setup global para tests.
// Aquí podríamos ejecutar migraciones si fuera necesario.
import pool from '../internal/adapters/db/pg.adapter';
import redis from '../internal/adapters/redis/redis.adapter';

afterAll(async () => {
	try { await pool.end(); } catch {}
	try { await (redis as any).quit?.(); } catch {}
});
