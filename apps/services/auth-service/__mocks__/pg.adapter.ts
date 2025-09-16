// __mocks__/pg.adapter.ts
// Mock compatible con import * as pgAdapter from ...
import { generateKeyPairSync } from 'crypto';








// Todas las funciones mockeadas y disponibles en default y como named
// __mocks__/pg.adapter.ts
// Mock enriquecido para pruebas aisladas: simula usuarios, roles y signing keys en memoria.

type User = {
  id: string;
  tenant_id: string;
  email: string;
  phone?: string | null;
  status: string;
  pwd_hash: string; // En mock guardaremos formato mock$<plain>
  pwd_salt: string;
  name: string;
  created_at: Date;
  __plain? : string; // Sólo para tests (no en prod)
};

type UserRole = { user_id: string; tenant_id: string; role: string };
type SigningKey = { kid: string; pem_private: string; pem_public: string; status: string; promoted_at?: Date | null; created_at: Date };

// Estado in-memory
const users: User[] = [];
const userRoles: UserRole[] = [];
const securityEvents: any[] = [];
const signingKeys: SigningKey[] = [];

// Utilidades internas
function findUserByEmail(email: string, tenant_id: string) {
  return users.find(u => u.email === email && u.tenant_id === tenant_id) || null;
}
function findUserById(id: string) {
  return users.find(u => u.id === id) || null;
}

// Funciones mockeadas (se redefinen como jest.fn para permitir assertions)
const createUser = jest.fn(async (user: Omit<User, 'created_at' | 'status' | '__plain'> & { status?: string; created_at?: Date }) => {
  const u: User = {
    id: user.id || `u_${Math.random().toString(36).slice(2)}`,
    tenant_id: user.tenant_id,
    email: user.email,
    phone: user.phone || null,
    status: user.status || 'active',
    // Simplificamos hash: si viene con prefijo mock$ lo dejamos, si no lo envolvemos.
    pwd_hash: user.pwd_hash.startsWith('mock$') ? user.pwd_hash : `mock$${user.pwd_hash}`,
    pwd_salt: user.pwd_salt || '',
    name: user.name,
    created_at: user.created_at || new Date(),
    __plain: user.pwd_hash.startsWith('mock$') ? user.pwd_hash.substring(5) : user.pwd_hash
  };
  users.push(u);
  if (process.env.AUTH_TEST_LOGS) console.log('[mock.createUser] stored', { email: u.email, tenant: u.tenant_id, id: u.id });
  // Auto-asignar rol base
  if (!userRoles.find(r => r.user_id === u.id && r.role === 'user')) {
    userRoles.push({ user_id: u.id, tenant_id: u.tenant_id, role: 'user' });
  }
  return u;
});

const getUserByEmail = jest.fn(async (email: string, tenant_id: string) => {
  const u = findUserByEmail(email, tenant_id);
  if (process.env.AUTH_TEST_LOGS) console.log('[mock.getUserByEmail]', email, tenant_id, '=>', !!u);
  return u;
});
const getUserById = jest.fn(async (id: string) => findUserById(id));

const assignUserRole = jest.fn(async (user_id: string, tenant_id: string, role: string) => {
  if (!userRoles.find(r => r.user_id === user_id && r.tenant_id === tenant_id && r.role === role)) {
    userRoles.push({ user_id, tenant_id, role });
  }
});

const getUserRoles = jest.fn(async (user_id: string, tenant_id: string) => {
  return userRoles.filter(r => r.user_id === user_id && r.tenant_id === tenant_id).map(r => r.role);
});

const listRoles = jest.fn(async (tenant_id?: string) => {
  const filtered = tenant_id ? userRoles.filter(r => r.tenant_id === tenant_id) : userRoles;
  return Array.from(new Set(filtered.map(r => r.role))).sort();
});

const logSecurityEvent = jest.fn(async (evt: any) => { securityEvents.push({ ...evt, ts: evt.ts || new Date() }); });

// Query engine simplificado para casos usados por keys.ts y algunos handlers
function ensureSigningKeySeed() {
  if (!signingKeys.find(k => k.status === 'current')) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    signingKeys.push({ kid: 'kid-current', pem_private: privateKey, pem_public: publicKey, status: 'current', promoted_at: new Date(), created_at: new Date() });
  }
}

const query = jest.fn(async (sql: string, params: any[] = []) => {
  // Garantizar objeto siempre
  if (!sql) return { rows: [] };
  const originalSql = sql;
  const s = sql.trim().toLowerCase();
  // Debug opcional
  if (process.env.AUTH_TEST_LOGS) {
    // eslint-disable-next-line no-console
    console.log('[mock.pg.query]', originalSql, params);
  }
  // Users
  if (s.startsWith('select * from users where email=')) {
    const [email, tenant] = params;
    const u = findUserByEmail(email, tenant);
    return { rows: u ? [u] : [] };
  }
  if (s.startsWith('select * from users where id=')) {
    const [id] = params;
    const u = findUserById(id);
    return { rows: u ? [u] : [] };
  }
  if (s.startsWith('insert into users')) {
    // Este camino normalmente no se invoca porque usamos createUser(); devolver stub
    return { rows: [] };
  }
  if (s.startsWith('select role from user_roles where user_id=')) {
    const [userId, tenant] = params;
    const rows = userRoles.filter(r => r.user_id === userId && r.tenant_id === tenant).map(r => ({ role: r.role }));
    return { rows };
  }
  // Update contraseña usuario (reset-password handler)
  if (s.startsWith('update users set pwd_hash')) {
    // Esperamos forma: UPDATE users SET pwd_hash=$1 WHERE id=$2
    const [newHash, userId] = params;
    const u = users.find(us => us.id === userId);
    if (u) {
      u.pwd_hash = newHash;
      if (newHash.startsWith('mock$')) {
        u.__plain = newHash.substring(5);
      } else {
        u.__plain = newHash; // fallback
      }
    }
    return { rows: [] };
  }
  if (s.startsWith('insert into user_roles')) {
    const [userId, tenant, role] = params;
    await assignUserRole(userId, tenant, role);
    return { rows: [] };
  }
  if (s.startsWith('select distinct role from user_roles where tenant_id=')) {
    const [tenant] = params;
    const roles = Array.from(new Set(userRoles.filter(r => r.tenant_id === tenant).map(r => r.role))).map(r => ({ role: r }));
    return { rows: roles };
  }
  if (s.startsWith('select distinct role from user_roles')) {
    const roles = Array.from(new Set(userRoles.map(r => r.role))).map(r => ({ role: r }));
    return { rows: roles };
  }
  // Security events insert
  if (s.startsWith('insert into audit_security')) {
    return { rows: [] };
  }
  // Signing keys
  if (s.includes('from auth_signing_keys')) {
    ensureSigningKeySeed();
    if (s.includes("status in ('current','next','retiring')")) {
      return { rows: signingKeys.filter(k => ['current','next','retiring'].includes(k.status)) };
    }
    if (s.includes("status in ('current','next')")) {
      return { rows: signingKeys.filter(k => ['current','next'].includes(k.status)) };
    }
    // Igualar tanto "status = 'current'" (con espacio) como "status='current'"
    if (s.includes("status = 'current'") || s.includes("status='current'")) {
      return { rows: signingKeys.filter(k => k.status === 'current') };
    }
    if (s.includes("status='next'")) {
      return { rows: signingKeys.filter(k => k.status === 'next') };
    }
    if (s.includes('where kid=')) {
      const [kid] = params;
      return { rows: signingKeys.filter(k => k.kid === kid) };
    }
  }
  if (s.startsWith('insert into auth_signing_keys')) {
    // Valores: kid, pem_private, pem_public, status
    const [kid, priv, pub, status] = params;
    const existing = signingKeys.find(k => k.kid === kid);
    if (!existing) {
      const row: SigningKey = { kid, pem_private: priv, pem_public: pub, status, promoted_at: null, created_at: new Date() };
      signingKeys.push(row);
      return { rows: [row] };
    }
    return { rows: [existing] };
  }
  if (s.startsWith('update auth_signing_keys set promoted_at')) {
    const [kid] = params;
    const k = signingKeys.find(sk => sk.kid === kid);
    if (k) k.promoted_at = new Date();
    return { rows: [] };
  }
  if (s.startsWith("update auth_signing_keys set status='retiring', retiring_at=now()")) {
    const [kid] = params;
    const k = signingKeys.find(sk => sk.kid === kid);
    if (k) { k.status = 'retiring'; (k as any).retiring_at = new Date(); }
    return { rows: [] };
  }
  if (s.startsWith("update auth_signing_keys set status='current', promoted_at=now()")) {
    const [kid] = params;
    const k = signingKeys.find(sk => sk.kid === kid);
    if (k) { k.status = 'current'; k.promoted_at = new Date(); }
    return { rows: [] };
  }
  if (s.startsWith("update auth_signing_keys set status='retiring'")) {
    const [kid] = params;
    const k = signingKeys.find(sk => sk.kid === kid);
    if (k) { k.status = 'retiring'; k.promoted_at = k.promoted_at || new Date(); }
    return { rows: [] };
  }
  if (s.startsWith("update auth_signing_keys set status='current'")) {
    const [kid] = params;
    const k = signingKeys.find(sk => sk.kid === kid);
    if (k) { k.status = 'current'; k.promoted_at = new Date(); }
    return { rows: [] };
  }
  // Generic fallback
  return { rows: [] };
});

const poolObj: any = {
  query,
  end: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue({
    query,
    release: jest.fn(),
    begin: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  })
};
export const pool = poolObj;

// Funciones auxiliares para tests (opcional exposición)
export const __mockData = { users, userRoles, signingKeys, securityEvents };
export const __reset = () => { users.length = 0; userRoles.length = 0; signingKeys.length = 0; securityEvents.length = 0; };

const log = (..._args: any[]) => {};

const pgAdapter = {
  createUser,
  getUserByEmail,
  getUserById,
  getUserRoles,
  assignUserRole,
  listRoles,
  logSecurityEvent,
  pool: poolObj,
  query,
  log,
};

export {
  createUser,
  getUserByEmail,
  getUserById,
  getUserRoles,
  assignUserRole,
  listRoles,
  logSecurityEvent,
  query
};
export default pgAdapter;
// Compatibilidad máxima para import * as pgAdapter y default en ESM/CJS
// @ts-ignore
module.exports = pgAdapter;
// @ts-ignore
module.exports.default = pgAdapter;
