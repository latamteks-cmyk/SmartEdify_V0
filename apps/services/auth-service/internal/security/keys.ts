import { randomUUID, generateKeyPairSync, createPublicKey } from 'crypto';
import pool from '../adapters/db/pg.adapter';

export type KeyStatus = 'current' | 'next' | 'retiring' | 'expired';

export interface SigningKey {
  kid: string;
  pem_private: string;
  pem_public: string;
  status: KeyStatus;
  created_at: Date;
  promoted_at?: Date | null;
  retiring_at?: Date | null;
}

// Sencillo cache en memoria (reinicio = recarga desde DB)
let cachedCurrent: SigningKey | null = null;
let cachedNext: SigningKey | null = null;
let byKid: Map<string, SigningKey> = new Map();
let lastLoad = 0;
const CACHE_TTL_MS = 30_000;

async function loadKeysFromDb() {
  const res = await pool.query<SigningKey>('SELECT * FROM auth_signing_keys WHERE status IN (\'current\',\'next\')');
  cachedCurrent = res.rows.find(r => r.status === 'current') || null;
  cachedNext = res.rows.find(r => r.status === 'next') || null;
  lastLoad = Date.now();
  byKid.clear();
  for (const r of res.rows) byKid.set(r.kid, r);
}

function ensureFreshCachePromise(): Promise<void> | void {
  if (Date.now() - lastLoad > CACHE_TTL_MS) return loadKeysFromDb();
}

export async function getCurrentKey(): Promise<SigningKey> {
  await ensureFreshCachePromise();
  if (cachedCurrent) return cachedCurrent;
  // No existe -> generar clave inicial
  await createAndPromoteInitialKey();
  if (!cachedCurrent) throw new Error('No se pudo crear clave inicial');
  return cachedCurrent;
}

export async function getNextKey(generateIfMissing = true): Promise<SigningKey | null> {
  await ensureFreshCachePromise();
  if (cachedNext) return cachedNext;
  if (!generateIfMissing) return null;
  cachedNext = await insertNewKey('next');
  return cachedNext;
}

function generateKeyPairPem(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}

async function insertNewKey(status: KeyStatus): Promise<SigningKey> {
  const kid = randomUUID();
  const { privateKey, publicKey } = generateKeyPairPem();
  const res = await pool.query<SigningKey>(
    'INSERT INTO auth_signing_keys(kid, pem_private, pem_public, status) VALUES ($1,$2,$3,$4) RETURNING *',
    [kid, privateKey, publicKey, status]
  );
  const row = res.rows[0];
  byKid.set(row.kid, row);
  return row;
}

async function createAndPromoteInitialKey() {
  const existing = await pool.query<SigningKey>("SELECT * FROM auth_signing_keys WHERE status = 'current'");
  if (existing.rows.length > 0) {
    cachedCurrent = existing.rows[0];
    return;
  }
  const created = await insertNewKey('current');
  await pool.query('UPDATE auth_signing_keys SET promoted_at = NOW() WHERE kid=$1', [created.kid]);
  cachedCurrent = created;
  byKid.set(created.kid, created);
}

export async function rotateKeys(): Promise<{ newCurrent: SigningKey; newNext: SigningKey | null }> {
  // Estrategia simple: current -> retiring, next -> current, generar nuevo next
  await loadKeysFromDb();
  const now = new Date();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: currRows } = await client.query<SigningKey>('SELECT * FROM auth_signing_keys WHERE status=\'current\'' );
    const { rows: nextRows } = await client.query<SigningKey>('SELECT * FROM auth_signing_keys WHERE status=\'next\'' );
    const current = currRows[0];
    const next = nextRows[0];
    if (!current || !next) {
      // Si falta alguno generamos el flujo normal
      if (!current) {
        const created = await insertNewKey('current');
        await client.query('UPDATE auth_signing_keys SET promoted_at=NOW() WHERE kid=$1', [created.kid]);
        cachedCurrent = created; byKid.set(created.kid, created);
      }
      if (!next) {
        cachedNext = await insertNewKey('next');
      }
      await client.query('COMMIT');
      return { newCurrent: cachedCurrent!, newNext: cachedNext };
    }
    await client.query('UPDATE auth_signing_keys SET status=\'retiring\', retiring_at=NOW() WHERE kid=$1', [current.kid]);
    await client.query('UPDATE auth_signing_keys SET status=\'current\', promoted_at=NOW() WHERE kid=$1', [next.kid]);
    const newNext = await insertNewKey('next');
    await client.query('COMMIT');
    cachedCurrent = { ...next, status: 'current', promoted_at: now };
    cachedNext = newNext;
    byKid.set(cachedCurrent.kid, cachedCurrent);
    byKid.set(cachedNext.kid, cachedNext);
    return { newCurrent: cachedCurrent, newNext };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function pemToJwk(pem: string, kid: string, status: string) {
  // createPublicKey + export JWK (Node >=16 soporta formato jwk para rsa)
  const pub = createPublicKey(pem);
  const jwk = pub.export({ format: 'jwk' }) as any; // {kty,n,e}
  return { ...jwk, kid, use: 'sig', alg: 'RS256', status };
}

export function buildJwks(keys: SigningKey[]): any {
  return { keys: keys.map(k => pemToJwk(k.pem_public, k.kid, k.status)) };
}

export async function getPublicJwks(): Promise<any> {
  await loadKeysFromDb();
  const res = await pool.query<SigningKey>('SELECT * FROM auth_signing_keys WHERE status IN (\'current\',\'next\',\'retiring\')');
  return buildJwks(res.rows);
}

export async function getKeyByKid(kid: string): Promise<SigningKey | null> {
  if (byKid.has(kid)) return byKid.get(kid)!;
  const res = await pool.query<SigningKey>('SELECT * FROM auth_signing_keys WHERE kid=$1', [kid]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  byKid.set(row.kid, row);
  return row;
}

export function __resetKeyCacheForTests() {
  if (process.env.NODE_ENV !== 'test') return;
  cachedCurrent = null;
  cachedNext = null;
  byKid = new Map();
  lastLoad = 0;
}
