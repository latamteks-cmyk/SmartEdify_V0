/*
 * Auth service specific Postgres mock. The implementation mirrors the
 * historical `__mocks__/pg.adapter.ts` shipped with the auth-service but is
 * now exposed as a factory so the same behaviour can be reused across
 * projects. Consumers must provide a Jest compatible implementation (the
 * global `jest` instance) so the created functions remain fully spy-able.
 */

import { generateKeyPairSync } from 'crypto';

export interface JestLike {
  fn: <TArgs extends any[], TReturn>(
    implementation?: (...args: TArgs) => TReturn
  ) => (...args: TArgs) => TReturn;
}

export interface AuthPgAdapterMock {
  readonly module: any;
  readonly reset: () => void;
  readonly data: {
    readonly users: User[];
    readonly userRoles: UserRole[];
    readonly signingKeys: SigningKey[];
    readonly securityEvents: any[];
  };
}

type User = {
  id: string;
  tenant_id: string;
  email: string;
  phone?: string | null;
  status: string;
  pwd_hash: string;
  pwd_salt: string;
  name: string;
  created_at: Date;
  __plain?: string;
};

type UserRole = { user_id: string; tenant_id: string; role: string };
type SigningKey = {
  kid: string;
  pem_private: string;
  pem_public: string;
  status: string;
  promoted_at?: Date | null;
  created_at: Date;
};

export function createAuthPgAdapterMock(jestLike: JestLike): AuthPgAdapterMock {
  if (!jestLike || typeof jestLike.fn !== 'function') {
    throw new Error('createAuthPgAdapterMock requires a Jest-like instance');
  }

  const users: User[] = [];
  const userRoles: UserRole[] = [];
  const securityEvents: any[] = [];
  const signingKeys: SigningKey[] = [];

  function reset() {
    users.length = 0;
    userRoles.length = 0;
    securityEvents.length = 0;
    signingKeys.length = 0;
  }

  const findUserByEmail = (email: string, tenant_id: string) =>
    users.find(user => user.email === email && user.tenant_id === tenant_id) || null;

  const findUserById = (id: string) => users.find(user => user.id === id) || null;

  const ensureSigningKeySeed = () => {
    if (signingKeys.find(k => k.status === 'current')) return;
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    signingKeys.push({
      kid: 'kid-current',
      pem_private: privateKey,
      pem_public: publicKey,
      status: 'current',
      promoted_at: new Date(),
      created_at: new Date()
    });
  };

  const createUser = jestLike.fn(async (user: {
    id?: string;
    tenant_id: string;
    email: string;
    phone?: string | null;
    status?: string;
    pwd_hash: string;
    pwd_salt?: string;
    name: string;
    created_at?: Date;
  }) => {
    const id = user.id || `u_${Math.random().toString(36).slice(2)}`;
    const normalizedHash = user.pwd_hash.startsWith('mock$')
      ? user.pwd_hash
      : `mock$${user.pwd_hash}`;
    const record: User = {
      id,
      tenant_id: user.tenant_id,
      email: user.email,
      phone: user.phone || null,
      status: user.status || 'active',
      pwd_hash: normalizedHash,
      pwd_salt: user.pwd_salt || '',
      name: user.name,
      created_at: user.created_at || new Date(),
      __plain: normalizedHash.substring(5)
    };
    users.push(record);
    if (!userRoles.find(role => role.user_id === id && role.role === 'user')) {
      userRoles.push({ user_id: id, tenant_id: user.tenant_id, role: 'user' });
    }
    return record;
  });

  const getUserByEmail = jestLike.fn(async (email: string, tenant_id: string) =>
    findUserByEmail(email, tenant_id)
  );

  const getUserById = jestLike.fn(async (id: string) => findUserById(id));

  const assignUserRole = jestLike.fn(async (user_id: string, tenant_id: string, role: string) => {
    if (!userRoles.find(r => r.user_id === user_id && r.tenant_id === tenant_id && r.role === role)) {
      userRoles.push({ user_id, tenant_id, role });
    }
  });

  const getUserRoles = jestLike.fn(async (user_id: string, tenant_id: string) =>
    userRoles
      .filter(role => role.user_id === user_id && role.tenant_id === tenant_id)
      .map(role => role.role)
  );

  const listRoles = jestLike.fn(async (tenant_id?: string) => {
    const filtered = tenant_id
      ? userRoles.filter(role => role.tenant_id === tenant_id)
      : userRoles;
    return Array.from(new Set(filtered.map(role => role.role))).sort();
  });

  const logSecurityEvent = jestLike.fn(async (evt: any) => {
    securityEvents.push({ ...evt, ts: evt?.ts || new Date() });
  });

  const query = jestLike.fn(async (sql: string, params: any[] = []) => {
    if (!sql) return { rows: [] };
    const normalized = sql.trim().toLowerCase();

    if (normalized.startsWith('select * from users where email=')) {
      const [email, tenant] = params;
      const user = findUserByEmail(email, tenant);
      return { rows: user ? [user] : [] };
    }

    if (normalized.startsWith('select * from users where id=')) {
      const [id] = params;
      const user = findUserById(id);
      return { rows: user ? [user] : [] };
    }

    if (normalized.startsWith('insert into users')) {
      const [tenant_id, email, phone, status, pwd_hash, pwd_salt, name, created_at] = params;
      return {
        rows: [
          await createUser({
            tenant_id,
            email,
            phone,
            status,
            pwd_hash,
            pwd_salt,
            name,
            created_at
          })
        ]
      };
    }

    if (normalized.startsWith('update users set pwd_hash')) {
      const [pwd_hash, id] = params;
      const user = findUserById(id);
      if (user) {
        user.pwd_hash = String(pwd_hash);
        user.__plain = user.pwd_hash.startsWith('mock$')
          ? user.pwd_hash.substring(5)
          : user.pwd_hash;
      }
      return { rows: [] };
    }

    if (normalized.startsWith('select role from user_roles where user_id=')) {
      const [user_id, tenant_id] = params;
      const roles = await getUserRoles(user_id, tenant_id);
      return { rows: roles.map(role => ({ role })) };
    }

    if (normalized.startsWith('select distinct role from user_roles')) {
      const roles = await listRoles(params[0]);
      return { rows: roles.map(role => ({ role })) };
    }

    if (normalized.startsWith('insert into user_roles')) {
      const [user_id, tenant_id, role] = params;
      await assignUserRole(user_id, tenant_id, role);
      return { rows: [] };
    }

    if (normalized.startsWith('insert into audit_security')) {
      await logSecurityEvent({
        actor: params[0],
        event: params[1],
        ip: params[2],
        ua: params[3],
        tenant_id: params[4],
        details_json: params[5],
        ts: params[6]
      });
      return { rows: [] };
    }

    if (normalized.includes('from auth_signing_keys')) {
      ensureSigningKeySeed();
      if (normalized.includes("status in ('current','next','retiring')")) {
        return { rows: signingKeys.filter(k => ['current', 'next', 'retiring'].includes(k.status)) };
      }
      if (normalized.includes("status in ('current','next')")) {
        return { rows: signingKeys.filter(k => ['current', 'next'].includes(k.status)) };
      }
      if (normalized.includes("status = 'current'") || normalized.includes("status='current'")) {
        return { rows: signingKeys.filter(k => k.status === 'current') };
      }
      if (normalized.includes("status='next'")) {
        return { rows: signingKeys.filter(k => k.status === 'next') };
      }
      if (normalized.includes('where kid=')) {
        const [kid] = params;
        return { rows: signingKeys.filter(k => k.kid === kid) };
      }
    }

    if (normalized.startsWith('insert into auth_signing_keys')) {
      const [kid, pem_private, pem_public, status] = params;
      let existing = signingKeys.find(k => k.kid === kid);
      if (!existing) {
        existing = {
          kid,
          pem_private,
          pem_public,
          status,
          promoted_at: null,
          created_at: new Date()
        };
        signingKeys.push(existing);
      }
      return { rows: [existing] };
    }

    if (normalized.startsWith('update auth_signing_keys set promoted_at')) {
      const [kid] = params;
      const key = signingKeys.find(k => k.kid === kid);
      if (key) key.promoted_at = new Date();
      return { rows: [] };
    }

    if (normalized.startsWith("update auth_signing_keys set status='retiring', retiring_at=now()")) {
      const [kid] = params;
      const key = signingKeys.find(k => k.kid === kid);
      if (key) {
        key.status = 'retiring';
        (key as any).retiring_at = new Date();
      }
      return { rows: [] };
    }

    if (normalized.startsWith("update auth_signing_keys set status='current', promoted_at=now()")) {
      const [kid] = params;
      const key = signingKeys.find(k => k.kid === kid);
      if (key) {
        key.status = 'current';
        key.promoted_at = new Date();
      }
      return { rows: [] };
    }

    if (normalized.startsWith("update auth_signing_keys set status='retiring'")) {
      const [kid] = params;
      const key = signingKeys.find(k => k.kid === kid);
      if (key) {
        key.status = 'retiring';
        key.promoted_at = key.promoted_at || new Date();
      }
      return { rows: [] };
    }

    if (normalized.startsWith("update auth_signing_keys set status='current'")) {
      const [kid] = params;
      const key = signingKeys.find(k => k.kid === kid);
      if (key) {
        key.status = 'current';
        key.promoted_at = new Date();
      }
      return { rows: [] };
    }

    return { rows: [] };
  });

  const poolConnect = jestLike.fn(async () => ({
    query,
    release: jestLike.fn(),
    begin: jestLike.fn(),
    commit: jestLike.fn(),
    rollback: jestLike.fn()
  }));

  const pool = {
    query,
    end: jestLike.fn(async () => undefined),
    connect: poolConnect
  };

  const log = (..._args: any[]) => {};

  const moduleExports: any = {
    __esModule: true,
    createUser,
    getUserByEmail,
    getUserById,
    getUserRoles,
    assignUserRole,
    listRoles,
    logSecurityEvent,
    pool,
    query,
    log,
    __resetMock: reset
  };

  moduleExports.default = moduleExports;

  return {
    module: moduleExports,
    reset,
    data: {
      users,
      userRoles,
      signingKeys,
      securityEvents
    }
  };
}

