import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'smartedify',
});

// Logs de diagnóstico eliminados tras estabilizar integración

// Usuarios
export async function createUser(user: {
  tenant_id: string;
  email: string;
  phone?: string;
  status?: string;
  pwd_hash: string;
  pwd_salt: string;
  name: string;
  created_at?: Date;
}) {
  const { tenant_id, email, phone, status, pwd_hash, pwd_salt, name, created_at } = user;
  try {
    const res = await pool.query(
      'INSERT INTO users (tenant_id, email, phone, status, pwd_hash, pwd_salt, name, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [tenant_id, email, phone || null, status || 'active', pwd_hash, pwd_salt, name, created_at || new Date()]
    );
    // (log suprimido)
    return res.rows[0];
  } catch (e: any) {
    if (process.env.AUTH_TEST_LOGS) console.error('[createUser] error', e);
    throw e;
  }
}
export async function getUserByEmail(email: string, tenant_id: string) {
  const res = await pool.query('SELECT * FROM users WHERE email=$1 AND tenant_id=$2', [email, tenant_id]);
  return res.rows[0];
}
export async function getUserById(id: string) {
  const res = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
  return res.rows[0];
}

// Roles
export async function getUserRoles(user_id: string, tenant_id: string) {
  const res = await pool.query('SELECT role FROM user_roles WHERE user_id=$1 AND tenant_id=$2', [user_id, tenant_id]);
  return res.rows.map(r => r.role);
}

export async function assignUserRole(user_id: string, tenant_id: string, role: string) {
  await pool.query(
    'INSERT INTO user_roles (user_id, tenant_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
    [user_id, tenant_id, role]
  );
}

export async function listRoles(tenant_id?: string) {
  if (tenant_id) {
    const res = await pool.query('SELECT DISTINCT role FROM user_roles WHERE tenant_id=$1 ORDER BY role ASC', [tenant_id]);
    return res.rows.map(r => r.role);
  }
  const res = await pool.query('SELECT DISTINCT role FROM user_roles ORDER BY role ASC');
  return res.rows.map(r => r.role);
}

// Auditoría
export async function logSecurityEvent(event: {
  actor: string;
  event: string;
  ip: string;
  ua: string;
  tenant_id: string;
  details_json?: any;
  ts?: Date;
}) {
  const { actor, event: evt, ip, ua, tenant_id, details_json, ts } = event;
  await pool.query(
    'INSERT INTO audit_security (actor, event, ip, ua, tenant_id, details_json, ts) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [actor, evt, ip, ua, tenant_id, JSON.stringify(details_json || {}), ts || new Date()]
  );
}

export default pool;

export async function endPool() {
  try { await pool.end(); } catch {}
}
