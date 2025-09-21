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
  
  // Limpiar claves cargadas de posibles caracteres corruptos de PostgreSQL
  const cleanedRows = res.rows.map((row: SigningKey) => ({
    ...row,
    pem_private: row.pem_private.replace(/\+\s*$/gm, '').trim(),
    pem_public: row.pem_public.replace(/\+\s*$/gm, '').trim()
  }));
  
  cachedCurrent = cleanedRows.find((r: SigningKey) => r.status === 'current') || null;
  cachedNext = cleanedRows.find((r: SigningKey) => r.status === 'next') || null;
  lastLoad = Date.now();
  byKid.clear();
  for (const r of cleanedRows) byKid.set(r.kid, r);
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
    const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDgp0EfSRyTMNfP
oosTktWB7lQ7ZCIQja+eCe7JFEfcQRtpQcsuogecmklLFbg07E8adeFXrxpPnmww
QwahKm+WlwTS9lKA/zrwLHH1DXCQsGV6Bm4CutuDnmiRwiDs8Cldaq8MkVKa0Gzg
8gIDObytIImdrJWA855cbb5HAEa9VF5/rYES2+buAZ+u1Vi5OH1AFe0SOcS0QkYa
myOriPmtVtrOKYL0vMz6wCMnV0IQZ/K0Keu+xNsu9P/19prx/etu86P8RrbHI8JO
RHVY6HQ4M40ZL1bLWsRw7OTEZEFB7nLAISw945jxsSv+OLtkWzz8VhXZ+3VRGzcM
bqKbfBmlAgMBAAECggEANOjPWpnyg+wN99X1YV/Erzw9VFuJ9lIYWWVHes4u+n3P
AeRAATSiDEz+FBQCdVxuaPH4Z5lS3guWuWsfxZdj/piEx1bCKaVy8RvWnvtSVpFk
5O9cu4Hcr0wAnsuUy5jodRrqLVCQnuuVqQj2VmIjwLaYEq2R7HP0CRrDpJ85Cd/C
8B6VRAuUiaV/4WKMWoHqxWBJ0R4ySJKtNWadXv5woCiqUrdv5V+Xr/WytIcOEcuK
InLqx406If/jCIFuvUBocrYCvYgvZGOqSTs2F5R+j4XrPaK6ozxVxPy5ZzLAMmYc
2XQHApaJETun4Rff+VRpCsEVICeDRx6FzU9ZwpcwJQKBgQD5qPaPT8X1Bc73vaOc
AMyz5BCCjEtPyORrEwpyANgjTXFAx+XeUxvtc9e6BkLLGXtEqCQx3BM6XweKGeXZ
9oViE8n1IYkyr4AWqjfh2DBbHytL1OeoMozU5ji0rx4y6puOorCDYkYFRT7n2j/h
BjpgbRaLx+T1j6D187399YjcIwKBgQDmW7kglu/rv/5aRfkidL85eUs9FpdxCswS
MTb8YAqwN7R3hRlSpsdI2n5I0QqaWCPDGCmH43TpyRPOUjbQXMsOJ9sPNVDhiwqj
x+prwBmR25uF7BgtFHN+cE7PRhUwI+ct9i8OOCeTUATZO75SLeQNYpS1dHJtItr7
uKgItexLlwKBgQD0+XFuMFXLVra+a4vGARbcEZaNswIXOMXBtz5RnTh4c34EleGd
5SkLN9dfhtM1nTxSozZY4lzPsv2f6kebN4WsNkS+TvjkDkd+deo9prfUQeJnF3N0
nJ2KLplH2mmkhoa7UDIpyV1xwH+4W3TA5i6T/ZbY8/1bY2MK0/AC6VIwxwKBgQDH
gCyGkvHaJH7uQ6eONbne1rNYhpZFqmouXz0VuT/IeZXr5POXZyU0bTXtbk1WensO
XYCqVU1No31ptD4QmiypZ88KDsyraLWgPmVBSC9c6Op6Q4x0jj+wAyfdzv5OoOl4
HruF/xAXPrfUQy+DEIdvKC9OLzliV0t7seKlGJk6pQKBgQCDo1Y3vTuijzUFZgIa
yfDAXIeVb/wUmNn3rGY5YSLBBBQyMZ85sH/8udcbpFPNJ2eEmSIL0vsinnLUNrbS
T57FQUR0+dglzMx65R2G+Hrc4x/GmhYL6xMODQbtcmpnwHsCk9zgKmVYz7nPja6b
FLP8wjGPPR/Wcbw7O1p4Esr6NQ==
-----END PRIVATE KEY-----`;
    const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4KdBH0kckzDXz6KLE5LV
ge5UO2QiEI2vngnuyRRH3EEbaUHLLqIHnJpJSxW4NOxPGnXhV68aT55sMEMGoSpv
lpcE0vZSgP868Cxx9Q1wkLBlegZuArrbg55okcIg7PApXWqvDJFSmtBs4PICAzm8
rSCJnayVgPOeXG2+RwBGvVRef62BEtvm7gGfrtVYuTh9QBXtEjnEtEJGGpsjq4j5
rVbazimC9LzM+sAjJ1dCEGfytCnrvsTbLvT/9faa8f3rbvOj/Ea2xyPCTkR1WOh0
ODONGS9Wy1rEcOzkxGRBQe5ywCEsPeOY8bEr/ji7ZFs8/FYV2ft1URs3DG6im3wZ
pQIDAQAB
-----END PUBLIC KEY-----`;
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
  
  // Sanitizar las claves para evitar corrupción por PostgreSQL
  const cleanPrivateKey = privateKey.replace(/\+\s*$/gm, '').trim();
  const cleanPublicKey = publicKey.replace(/\+\s*$/gm, '').trim();
  
  const res = await execQuery(
    'INSERT INTO auth_signing_keys(kid, pem_private, pem_public, status) VALUES ($1,$2,$3,$4) RETURNING *',
    [kid, cleanPrivateKey, cleanPublicKey, status]
  );
  let row = res.rows[0];
  if (!row) {
    // Fallback defensivo para mock débil
    row = { kid, pem_private: cleanPrivateKey, pem_public: cleanPublicKey, status, created_at: new Date(), promoted_at: null } as any;
  }
  
  // Asegurar que las claves en cache también estén limpias
  row.pem_private = row.pem_private.replace(/\+\s*$/gm, '').trim();
  row.pem_public = row.pem_public.replace(/\+\s*$/gm, '').trim();
  
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
