// Configuración de entorno para pruebas (cargada antes de test suites)
import 'dotenv/config';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Carga de .env raíz (independiente de si existen variables) para asegurar PGPORT y credenciales centralizadas.
try {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) { // subir hasta 6 niveles máximo
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[setup-env] error buscando .env raíz:', (e as any)?.message);
}

// Usa las credenciales definidas en .env raíz; no forzamos valores para permitir centralización
// (Si faltan, se aplicarán defaults en la construcción de la URL más abajo)

// Construcción dinámica si no está definida TENANT_DB_URL
{
  const desiredUser = process.env.POSTGRES_USER || 'postgres';
  const desiredPass = process.env.POSTGRES_PASSWORD || 'postgres';
  const desiredDb = process.env.POSTGRES_DB || 'smartedify';
  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || process.env.PG_PORT || '5542';
  const shouldOverride = !process.env.TENANT_DB_URL || !process.env.TENANT_DB_URL.startsWith(`postgres://${desiredUser}:`);
  if (shouldOverride) {
    process.env.TENANT_DB_URL = `postgres://${desiredUser}:${desiredPass}@${host}:${port}/${desiredDb}`;
  }
}

// eslint-disable-next-line no-console
// Ajuste de puerto si se quedó 5432 hardcoded pero PGPORT indica otro (host mapping)
if (process.env.TENANT_DB_URL) {
  const desiredPort = process.env.PGPORT || '5542';
  if (desiredPort !== '5432' && /@localhost:5432\//.test(process.env.TENANT_DB_URL)) {
    process.env.TENANT_DB_URL = process.env.TENANT_DB_URL.replace(':5432/', `:${desiredPort}/`);
  }
}

console.log('[setup-env] POSTGRES_USER=', process.env.POSTGRES_USER, 'PGPORT=', process.env.PGPORT, 'TENANT_DB_URL=', process.env.TENANT_DB_URL);

process.env.TENANT_LOG_LEVEL = process.env.TENANT_LOG_LEVEL || 'error';
process.env.OTEL_SDK_DISABLED = 'true';

async function probeDb(retries = 5, delayMs = 500): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    const url = process.env.TENANT_DB_URL!;
    const client = new Client({ connectionString: url });
    const timeoutMs = 1200;
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        client.connect(),
        new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('db-timeout')), timeoutMs); })
      ]);
      await client.end();
      return true;
    } catch (e) {
      // Log mínimo para diagnóstico
      // eslint-disable-next-line no-console
      console.warn(`[probe-db] intento ${i + 1} fallo: ${(e as any)?.message}`);
      try { await client.end(); } catch {}
      if (timer) clearTimeout(timer);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return false;
}

const canDb = await probeDb();
if (!canDb) {
  // Si la URL no es la default fallback, intenta forzar ejecución (para ver error real en tests) quitando skip.
  const isFallback = process.env.TENANT_DB_URL?.includes('postgres:postgres@localhost:5542/postgres');
  if (isFallback) {
    process.env.SKIP_DB_TESTS = '1';
  } else {
    // Continuamos sin skip para obtener error claro en tests de integración
    console.warn('[probe-db] no se pudo conectar, se ejecutarán tests para mostrar error de conexión');
  }
} else {
  await (await import('./migrate.js')).runMigrationsIfNeeded();
}
