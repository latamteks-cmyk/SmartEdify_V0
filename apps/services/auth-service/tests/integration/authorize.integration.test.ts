import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';
import { createHash, randomBytes } from 'crypto';
import { URL } from 'url';
import { app } from '../../cmd/server/main';
import pool, { assignUserRole } from '../../internal/adapters/db/pg.adapter';
import redis from '../../internal/adapters/redis/redis.adapter';

const DEFAULT_TENANT = 'default';
const CLIENT_ID = process.env.AUTH_DEFAULT_CLIENT_ID || 'squarespace';
const REDIRECT_URI =
  process.env.AUTH_LOCAL_REDIRECT_URI ||
  process.env.AUTH_DEFAULT_REDIRECT_URI ||
  'https://www.smart-edify.com/auth/callback';
const PRIVILEGED_SCOPE = 'admin';
const DEFAULT_SCOPE = 'openid profile email offline_access';

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildPkcePair(): { verifier: string; challenge: string } {
  const verifier = toBase64Url(randomBytes(48));
  const challenge = toBase64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function randomEmail(prefix: string): string {
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${slug}@demo.com`;
}

async function resetStores() {
  await pool.query('TRUNCATE TABLE audit_security, user_roles, users RESTART IDENTITY CASCADE');
  await (redis as any).flushdb?.();
  const stores = ['__REFRESH_STORE__', '__AUTH_CODE_STORE__', '__PWDRESET_STORE__'];
  for (const key of stores) {
    const store = (global as any)[key];
    if (store && typeof store.clear === 'function') {
      store.clear();
    }
  }
}

async function registerUser(email: string, password: string, roles: string[]): Promise<{ id: string }> {
  const response = await request(app)
    .post('/register')
    .send({ email, password, name: 'RBAC Tester', tenant_id: DEFAULT_TENANT });
  expect(response.status).toBe(201);
  const userId = response.body?.user?.id;
  expect(typeof userId).toBe('string');
  for (const role of roles) {
    if (role === 'user') continue; // rol por defecto
    await assignUserRole(userId, DEFAULT_TENANT, role);
  }
  return { id: userId };
}

async function loginUser(email: string, password: string) {
  const response = await request(app)
    .post('/login')
    .send({ email, password, tenant_id: DEFAULT_TENANT });
  expect(response.status).toBe(200);
  expect(response.body.access_token).toBeDefined();
  expect(response.body.refresh_token).toBeDefined();
  return {
    accessToken: response.body.access_token as string,
    refreshToken: response.body.refresh_token as string,
    roles: response.body.roles as string[],
  };
}

async function performAuthorizationCodeFlow(options: {
  roles: string[];
  scope?: string;
}) {
  const email = randomEmail(options.roles.includes('admin') ? 'admin' : 'user');
  const password = 'RBACpass!123';
  const scope = options.scope ?? DEFAULT_SCOPE;
  await registerUser(email, password, options.roles);
  const session = await loginUser(email, password);

  const { verifier, challenge } = buildPkcePair();
  const state = `state-${Math.random().toString(36).slice(2, 10)}`;
  const authorizeResponse = await request(app)
    .get('/authorize')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .query({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
  expect(authorizeResponse.status).toBe(302);
  const location = authorizeResponse.headers.location as string;
  expect(typeof location).toBe('string');
  const redirect = new URL(location);
  const code = redirect.searchParams.get('code');
  const returnedState = redirect.searchParams.get('state');
  expect(code).toBeTruthy();
  expect(returnedState).toBe(state);

  const tokenResponse = await request(app)
    .post('/token')
    .send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    });
  expect(tokenResponse.status).toBe(200);
  expect(tokenResponse.body.access_token).toBeDefined();
  expect(tokenResponse.body.refresh_token).toBeDefined();
  expect(tokenResponse.body.scope).toContain('openid');

  return {
    accessToken: tokenResponse.body.access_token as string,
    refreshToken: tokenResponse.body.refresh_token as string,
    scope: tokenResponse.body.scope as string,
    loginRoles: session.roles,
  };
}

describe('OAuth authorize/token/introspection/revocation', () => {
  beforeEach(async () => {
    await resetStores();
  });

  it('emite tokens para usuarios con rol admin y preserva sus scopes', async () => {
    const result = await performAuthorizationCodeFlow({ roles: ['user', 'admin'] });
    expect(result.loginRoles).toEqual(expect.arrayContaining(['admin']));

    const introspection = await request(app)
      .post('/introspection')
      .send({ token: result.accessToken, client_id: CLIENT_ID });
    expect(introspection.status).toBe(200);
    expect(introspection.body.active).toBe(true);
    expect(introspection.body.roles).toEqual(expect.arrayContaining(['admin']));
    expect(introspection.body.scope.split(' ')).toEqual(expect.arrayContaining(['openid']));
  });

  it('rechaza solicitudes con scopes privilegiados no permitidos para el cliente', async () => {
    const email = randomEmail('scope-denied');
    const password = 'RBACpass!123';
    await registerUser(email, password, ['user']);
    const session = await loginUser(email, password);

    const { challenge } = buildPkcePair();
    const response = await request(app)
      .get('/authorize')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .query({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: `openid ${PRIVILEGED_SCOPE}`,
        state: 'deny',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_scope');
  });

  it('revoca refresh tokens y refleja el bloqueo en /introspection', async () => {
    const result = await performAuthorizationCodeFlow({ roles: ['user', 'admin'] });

    const revoke = await request(app)
      .post('/revocation')
      .send({ token: result.refreshToken, client_id: CLIENT_ID });
    expect(revoke.status).toBe(200);

    const introspection = await request(app)
      .post('/introspection')
      .send({ token: result.refreshToken, client_id: CLIENT_ID });
    expect(introspection.status).toBe(200);
    expect(introspection.body.active).toBe(false);
  });
});
