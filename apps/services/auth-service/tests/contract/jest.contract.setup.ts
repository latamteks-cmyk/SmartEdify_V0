process.env.NODE_ENV = 'test';

const { randomUUID } = require('crypto');

type SigningKeyRow = {
  kid: string;
  pem_private: string;
  pem_public: string;
  status: string;
  created_at: Date;
  promoted_at?: Date | null;
  retiring_at?: Date | null;
};

type UserRecord = {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  pwd_hash: string;
  pwd_salt: string;
  status?: string;
  created_at: Date;
};

const keyRows: SigningKeyRow[] = [];
const userByCompositeKey: Map<string, UserRecord> = new Map();
const userById: Map<string, UserRecord> = new Map();
const userRoles: Map<string, Set<string>> = new Map();

function upsertKey(row: SigningKeyRow) {
  const idx = keyRows.findIndex(k => k.kid === row.kid);
  if (idx === -1) {
    keyRows.push(row);
  } else {
    keyRows[idx] = row;
  }
}

const pool = {
  async query(sql: string, params?: any[]) {
    const text = sql.trim();
    const lower = text.toLowerCase();
    if (lower === 'select 1') {
      return { rows: [{ ok: 1 }], rowCount: 1 };
    }
    if (lower.startsWith('select * from auth_signing_keys where status in')) {
      const wantRetiring = lower.includes("'retiring'");
      const statuses = wantRetiring ? ['current', 'next', 'retiring'] : ['current', 'next'];
      const rows = keyRows.filter(k => statuses.includes(k.status));
      return { rows };
    }
    if (lower.startsWith("select * from auth_signing_keys where status='current'")) {
      const rows = keyRows.filter(k => k.status === 'current');
      return { rows };
    }
    if (lower.startsWith("select * from auth_signing_keys where status='next'")) {
      const rows = keyRows.filter(k => k.status === 'next');
      return { rows };
    }
    if (lower.startsWith('select * from auth_signing_keys where kid=')) {
      const kid = params?.[0];
      const rows = keyRows.filter(k => k.kid === kid);
      return { rows };
    }
    if (lower.startsWith('insert into auth_signing_keys')) {
      const [kid, pem_private, pem_public, status] = params || [];
      const row: SigningKeyRow = {
        kid,
        pem_private,
        pem_public,
        status,
        created_at: new Date(),
        promoted_at: null,
        retiring_at: null
      };
      upsertKey(row);
      return { rows: [row] };
    }
    if (lower.startsWith('update auth_signing_keys set promoted_at')) {
      const kid = params?.[0];
      const existing = keyRows.find(k => k.kid === kid);
      if (existing) {
        existing.promoted_at = new Date();
      }
      return { rows: [] };
    }
    if (lower.startsWith('update auth_signing_keys set status=')) {
      const kid = params?.[0];
      const existing = keyRows.find(k => k.kid === kid);
      if (existing) {
        if (lower.includes("'retiring'")) {
          existing.status = 'retiring';
          existing.retiring_at = new Date();
        } else if (lower.includes("'current'")) {
          existing.status = 'current';
          existing.promoted_at = new Date();
        } else if (lower.includes("'next'")) {
          existing.status = 'next';
        }
      }
      return { rows: [] };
    }
    if (['begin', 'commit', 'rollback'].includes(lower)) {
      return { rows: [] };
    }
    // Fallback: devolver vacío para queries no relevantes en contratos
    return { rows: [] };
  },
  async connect() {
    return {
      query: (sql: string, params?: any[]) => pool.query(sql, params),
      release: () => {}
    };
  }
};

function compositeKey(tenantId: string, email: string) {
  return `${tenantId}::${email.toLowerCase()}`;
}

const contractDbMock: any = {
  __esModule: true,
  default: pool,
  async createUser(user: any) {
    const id = randomUUID();
    const record: UserRecord = {
      id,
      tenant_id: user.tenant_id,
      email: user.email,
      name: user.name,
      pwd_hash: user.pwd_hash,
      pwd_salt: user.pwd_salt,
      status: user.status || 'active',
      created_at: user.created_at || new Date()
    };
    userByCompositeKey.set(compositeKey(record.tenant_id, record.email), record);
    userById.set(id, record);
    return record;
  },
  async getUserByEmail(email: string, tenant_id: string) {
    return userByCompositeKey.get(compositeKey(tenant_id, email)) || null;
  },
  async getUserById(id: string) {
    return userById.get(id) || null;
  },
  async getUserRoles(user_id: string, tenant_id: string) {
    const key = `${tenant_id}::${user_id}`;
    const set = userRoles.get(key);
    return set ? Array.from(set) : [];
  },
  async assignUserRole(user_id: string, tenant_id: string, role: string) {
    const key = `${tenant_id}::${user_id}`;
    let set = userRoles.get(key);
    if (!set) {
      set = new Set();
      userRoles.set(key, set);
    }
    set.add(role);
  },
  async listRoles(tenant_id?: string) {
    const collected = new Set<string>();
    if (tenant_id) {
      for (const [key, roles] of userRoles.entries()) {
        if (key.startsWith(`${tenant_id}::`)) {
          roles.forEach(role => collected.add(role));
        }
      }
    } else {
      userRoles.forEach(roles => roles.forEach(role => collected.add(role)));
    }
    return Array.from(collected).sort();
  },
  async logSecurityEvent() {
    return;
  },
  async endPool() {
    return;
  },
  __resetMock() {
    userByCompositeKey.clear();
    userById.clear();
    userRoles.clear();
  }
};

jest.mock('../../internal/adapters/db/pg.adapter', () => contractDbMock);

jest.mock('ioredis');
