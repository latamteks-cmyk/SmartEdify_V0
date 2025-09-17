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
      // eslint-disable-next-line no-console
  const verbose = process.env.MIGRATE_VERBOSE === '1';
  if (verbose) console.log(`[migrate] iniciando. Directorio: ${dir}. Archivos: ${files.join(', ')}`);
      // Nota: evitamos el 'backfill' que marcaba todo como aplicado.
      // En su lugar, siempre intentamos aplicar migraciones de forma idempotente.
      // Esto asegura que columnas nuevas (p. ej., trace_id/span_id) se creen aunque ya existan tablas base.

      // Aplicar faltantes
      const appliedInner = await getApplied();
    for (const f of files) {
      // eslint-disable-next-line no-console
          if (verbose) console.log(`[migrate] aplicando ${f}`);
          const sql = readFileSync(join(dir, f), 'utf8');
          const checksum = fileChecksum(sql);

          // Ejecutamos por statement y toleramos errores idempotentes
          // Eliminar comentarios de línea para evitar que un bloque que inicia con '--' sea filtrado indebidamente
          const cleaned = sql.replace(/(^|\n)\s*--.*(?=\n|$)/g, '$1');
          const statements = cleaned
            .split(/;\s*\n/)
            .map(s => s.trim())
            .filter(Boolean);

          for (const st of statements) {
            // eslint-disable-next-line no-console
            if (verbose) console.log('[migrate] exec:', st.replace(/\s+/g, ' ').slice(0, 200));
            try {
              await c.query(st);
            } catch (e: any) {
              if (IDEMPOTENT_CODES.has(e.code)) {
                // ignorar errores esperados por idempotencia
                continue;
              }
              // eslint-disable-next-line no-console
              if (verbose) console.error('[migrate] error:', e.code, e.message);
              throw e;
            }
          }

          await c.query(
            'INSERT INTO schema_migrations (filename, checksum) VALUES ($1,$2)\n             ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum',
            [f, checksum]
          );
      }
      // eslint-disable-next-line no-console
  if (verbose) console.log('[migrate] completado');
    } finally {
      await withConn(cc => cc.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]));
    }
  });
}
