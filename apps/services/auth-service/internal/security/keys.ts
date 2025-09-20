import { randomUUID, generateKeyPairSync, createPublicKey } from 'crypto';

// Usar alias unificado para que Jest aplique el mock correctamente
import * as pgAdapter from '../adapters/db/pg.adapter';
// El mock expone pool.query; en producción pgAdapter.pool es un Pool real
const poolRef: any = (pgAdapter as any).pool || (pgAdapter as any).default?.pool;
const execQuery = async (sql: string, params?: any[]) => {
  let res;
  if (poolRef && typeof poolRef.query === 'function') res = await poolRef.query(sql, params);
  else if ((pgAdapter as any).query) res = await (pgAdapter as any).query(sql, params);
  else if ((pgAdapter as any).default?.query) res = await (pgAdapter as any).default.query(sql, params);
  else throw new Error('No query function available in pgAdapter mock');
  if (!res) return { rows: [] };
  if (!('rows' in res)) return { rows: [] };
  return res;
};

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
  const res = await execQuery("SELECT * FROM auth_signing_keys WHERE status IN ('current','next')");
  cachedCurrent = res.rows.find((r: SigningKey) => r.status === 'current') || null;
  cachedNext = res.rows.find((r: SigningKey) => r.status === 'next') || null;
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
  // En test devolvemos un par fijo para acelerar y evitar dependencias criptográficas pesadas
  if (process.env.NODE_ENV === 'test') {
    // Par RSA 2048 generado exclusivamente para tests (NO usar en producción)
    // Se mantiene estático para estabilidad determinista de snapshots / fixtures.
    const privateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDHRcr2QKPagPzp\nGyIO5NWMZZkLVzGm04Bmzn9m9ewzazf6RGjkH4eCy8mfQlwHgcUJKyRhKiTpUec7\nT6Ah+DsTF5pXydgRDL9T9qmj2Hktd1aw3mVZNeJItqAxWV7Zu1bM/j6WuGJi+jTO\nEThZXWbmZF7LhjkpZQxOfdPaeBmjhMYJ3tu3KMn7o28HMuqpEOcExja9bpBlpoxG\nPWptGy2k6ndxHgNK+xVIBGy/J36254OumJGz3mrNI/Z3xFUa9mxv+Hf0S/9Zp6zd\nqLUf2bQAZowwHU+VlXDxBrRT1ik3P/KjicqvUpJ7/fkY9cZvtQef640iXw/cjTrI\nHwlNU2GzAgMBAAECggEAEr0EM2gW22tik1Nap9XyrjaeclHSmvJodc1tG6ZjX8xP\nysQ8kte0QhqY9jmok/zaq8wkHxnrGJo1Uhts9AV+kbnMIWshuXyCn7uDRQ39bFrT\nYv9sxVPo7ered8hDXfve17qgeJRpmdgjS2/Z5EerABIaiuWw4vKR1Tna5nUfSYfF\n+kF1+IBitc+TDc8cgGVLEfR1zVwUMwR2KKAV1PEn5KLF7XD/hoSdSXth3N1INeCS\nMeST/Ioeq7xG/3USxJgrV5mJjQgmFMVa232YSZC2F2ywoSKIg9woQYGU+lMGOJ1G\nJ6kZqEUEP4bGsX0Ogx+IzYlQJyEq9QPgULFAYOgCeQKBgQD+iRzzCVHPdM4kDHrN\ni7Odd+vIfj4VpX1bhu6XfS3TgErrLbg8Sm4tanAGrMgxEmaXccxUBfHNm3YmAmPY\n3MXKLaXKQD94W2XjyBvx9mSML3uxTW6qoHZ3zd2VxgQ06AFWPbEQk6ZD1ijQTvYi\nCVCqQ26C+6S1TPNE5pTHMTjAhwKBgQDHbMpv2YNorxDwdKxLhrGhSF1DsrrNeyQd\ndlJj9/QkW2VOu0o5/4/lrMei7DgAh8APyFkpAEXlray5VikbkB5Ix6GxEZ8SIBvX\nEWEFdiqx8xQeFCZJRpkTFCTUjQGiy69exNaAxxAf2iJGQI3bznUzm98JceB9olEW\nzalJjwP6LwKBgDdOShL8PXxQKXYy1Q7SvfgOM8FDkUI4+TYRszD2csuw1rFdUTyi\nSu559ylGdDVJbM0xJGczbGVcKx2CnIuL8/6esu1ShG5qFlJrVOocj6Edp7/tz7db\nBhXR1w1QoQNYNS8fMLzlfCcACDe1Hf6a+rCE6kazzEexQLfrcvKe4TAxAoGAR/lM\n5GQjhoKYh2I2uL72ZHfJOiQNjIlFCAv8YfWZ8qtDZ+zPMA5URZlMs2F3UWO7G/ct\nNkM1+gLOiNfsNxQMM+SlZqC433nYZ4SRmvp9qn2SiADAuSL1MM6POQiiqy4Hcj17\ntJd2RdSiEEXMVmnoi5eYCGUvliIcM3Q9ljGCrH8CgYAviuSqMIpQYRgXstQ3WbrG\nmo08BUsOmcPGOAhNe6f1Tg9MboGpa5udfZk1ocGfYjaF3jrYjyx6+cUTrJ9sv/3C\nMmJdat+JiTOD7brpyUHuhrvhLR7VGGsaQSco0twjyRRMMBZrWSVaPAyoyARcyLEl\nMgTx5su/HM6sDfpmsBqcmw==\n-----END PRIVATE KEY-----`;
    const publicKey = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx0XK9kCj2oD86RsiDuTV\njGWZC1cxptOAZs5/ZvXsM2s3+kRo5B+HgsvJn0JcB4HFCSskYSok6VHnO0+gIfg7\nExe aV8nYEQy/U/apo9h5LXdWsN5lWTXiSLagMVle2btWzP4+lrhiYvo0zhE4WV1m\n5mRey4Y5KWUMTn3T2ngZo4TGCd7btyjJ+6NvBzLqqRDnBMY2vW6QZaacRj1qbRst\npOp3cR4DSvsVSARsvyd+tueDrpiRs95qzSP2d8RVGvZsb/h39Ev/Waes3ai1H9m0\nAGaMMB1PlZVw8Qa0U9YpNz/yo4nKr1KSe/35GPXGb7UHn+uNIl8P3I06yB8JTVNh\n swIDAQAB\n-----END PUBLIC KEY-----`.replace(/ Exe aV8n/,'Exe aV8n'); // Protección accidental de formateo
    return { privateKey, publicKey };
  }
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
  const res = await execQuery(
    'INSERT INTO auth_signing_keys(kid, pem_private, pem_public, status) VALUES ($1,$2,$3,$4) RETURNING *',
    [kid, privateKey, publicKey, status]
  );
  let row = res.rows[0];
  if (!row) {
    // Fallback defensivo para mock débil
    row = { kid, pem_private: privateKey, pem_public: publicKey, status, created_at: new Date(), promoted_at: null } as any;
  }
  byKid.set(row.kid, row);
  return row;
}

async function createAndPromoteInitialKey() {
  const existing = await execQuery("SELECT * FROM auth_signing_keys WHERE status = 'current'");
  if (existing.rows.length > 0) {
    cachedCurrent = existing.rows[0];
    return;
  }
  const created = await insertNewKey('current');
  await execQuery('UPDATE auth_signing_keys SET promoted_at = NOW() WHERE kid=$1', [created.kid]);
  cachedCurrent = created;
  byKid.set(created.kid, created);
}

export async function rotateKeys(): Promise<{ newCurrent: SigningKey; newNext: SigningKey | null }> {
  // Estrategia simple: current -> retiring, next -> current, generar nuevo next
  await loadKeysFromDb();
  const now = new Date();
  const client = poolRef ? await poolRef.connect() : { query: execQuery, release: () => {} } as any;
  try {
    await client.query('BEGIN');
  const { rows: currRows } = await client.query('SELECT * FROM auth_signing_keys WHERE status=\'current\'' );
  const { rows: nextRows } = await client.query('SELECT * FROM auth_signing_keys WHERE status=\'next\'' );
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
  if (cachedCurrent) byKid.set(cachedCurrent.kid, cachedCurrent);
    byKid.set(cachedNext.kid, cachedNext);
  if (!cachedCurrent) throw new Error('No se pudo obtener clave actual tras rotación');
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
  const res = await execQuery("SELECT * FROM auth_signing_keys WHERE status IN ('current','next','retiring')");
  return buildJwks(res.rows);
}

export async function getKeyByKid(kid: string): Promise<SigningKey | null> {
  if (byKid.has(kid)) return byKid.get(kid)!;
  const res = await execQuery('SELECT * FROM auth_signing_keys WHERE kid=$1', [kid]);
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
