import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'crypto';
import { join } from 'node:path';
import { withConn } from '../internal/adapters/repo/db.js';

async function ensureMigrationsTable() {
  await withConn(c => c.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`));
}

async function getApplied(): Promise<Record<string, string>> {
  return await withConn(async c => {
    const res = await c.query('SELECT filename, checksum FROM schema_migrations');
    const map: Record<string, string> = {};
    for (const r of res.rows) map[r.filename] = r.checksum;
    return map;
  });
}

function fileChecksum(contents: string): string {
  return createHash('sha256').update(contents).digest('hex');
}

async function coreTablesPresent(): Promise<boolean> {
  return await withConn(async c => {
    const q = `SELECT COUNT(*)>0 AS present FROM pg_class WHERE relname IN ('tenants','governance_positions')`;
    const r = await c.query(q);
    return r.rows[0].present;
  });
}

const IDEMPOTENT_CODES = new Set(['42P07','42710','23505','42701']); // table exists, duplicate object, unique violation, column exists

export async function runMigrationsIfNeeded() {
  await ensureMigrationsTable();
  const dir = join(process.cwd(), 'migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const LOCK_KEY = 48721019;

  await withConn(async c => {
    await c.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    try {
      const applied = await getApplied();

      // Backfill: si ya existen tablas núcleo y no hay migraciones registradas
      if (Object.keys(applied).length === 0 && await coreTablesPresent()) {
        for (const f of files) {
          const sql = readFileSync(join(dir, f), 'utf8');
            const checksum = fileChecksum(sql);
            await c.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1,$2) ON CONFLICT DO NOTHING', [f, checksum]);
        }
        return; // Schema ya aplicado previamente fuera del nuevo sistema
      }

      // Aplicar faltantes
      const appliedInner = await getApplied();
      for (const f of files) {
        if (appliedInner[f]) continue;
        const sql = readFileSync(join(dir, f), 'utf8');
        const checksum = fileChecksum(sql);
        const statements = sql
          .split(/;\s*\n/)
          .map(s => s.trim())
          .filter(Boolean)
          .filter(s => !s.startsWith('--'));
        for (const st of statements) {
          try {
            await c.query(st);
          } catch (e: any) {
            if (IDEMPOTENT_CODES.has(e.code)) {
              // ignorar y continuar
            } else {
              throw e;
            }
          }
        }
        await c.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1,$2)', [f, checksum]);
      }
    } finally {
      await withConn(cc => cc.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]));
    }
  });
}
