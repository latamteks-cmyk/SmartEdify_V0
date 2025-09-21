import request from 'supertest';
import { Express } from 'express';
import { app } from '../../cmd/server/main';
import pool, { assignUserRole } from '../../internal/adapters/db/pg.adapter';
import { createHash, randomBytes } from 'crypto';
import { URL } from 'url';

const DEFAULT_TENANT = 'default';
const CLIENT_ID = process.env.AUTH_DEFAULT_CLIENT_ID || 'squarespace';
const REDIRECT_URI = process.env.AUTH_DEFAULT_REDIRECT_URI || 'https://www.smart-edify.com/auth/callback';

// --- Funciones de Ayuda ---

export function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildPkcePair(): { verifier: string; challenge: string } {
  const verifier = toBase64Url(randomBytes(48));
  const challenge = toBase64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function randomEmail(prefix: string): string {
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${slug}@demo.com`;
}

export async function registerUser(app: Express, email: string, password: string, name: string = 'Test User', roles: string[] = ['user']): Promise<{ id: string, response: request.Response }> {
  const response = await request(app)
    .post('/register')
    .send({ email, password, name, tenant_id: DEFAULT_TENANT });
  
  const userId = response.body?.user?.id;
  if (response.status === 201 && userId) {
    expect(typeof userId).toBe('string');
    for (const role of roles) {
      if (role === 'user') continue;
      await assignUserRole(userId, DEFAULT_TENANT, role);
    }
  }
  
  return { id: userId, response };
}

export async function loginUser(app: Express, email: string, password: string) {
  const response = await request(app)
    .post('/login')
    .send({ email, password, tenant_id: DEFAULT_TENANT });
  
  expect(response.status).toBe(200);
  expect(response.body.access_token).toBeDefined();
  expect(response.body.refresh_token).toBeDefined();

  return {
    accessToken: response.body.access_token as string,
    refreshToken: response.body.refresh_token as string,
    roles: response.body.user.roles as string[],
  };
}

export async function getAuthCode(opts: {
  app: Express;
  user: { email: string; password: string };
  clientId: string;
  scopes: string[];
  pkce: boolean;
}): Promise<{ code: string; codeVerifier?: string; state: string }> {
  const { app, user, clientId, scopes, pkce } = opts;
  const session = await loginUser(app, user.email, user.password);

  let verifier: string | undefined;
  let challenge: string | undefined;
  if (pkce) {
    const pkcePair = buildPkcePair();
    verifier = pkcePair.verifier;
    challenge = pkcePair.challenge;
  }

  const state = `state-${Math.random().toString(36).slice(2, 10)}`;

  const authorizeResponse = await request(app)
    .get('/authorize')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .query({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: 'http://localhost:3000/callback',
      scope: scopes.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: pkce ? 'S256' : undefined,
    });

  expect(authorizeResponse.status).toBe(302);
  const location = authorizeResponse.headers.location as string;
  const redirect = new URL(location);
  const code = redirect.searchParams.get('code');
  expect(code).toBeDefined();

  return { code: code!, codeVerifier: verifier, state };
}


export async function createOAuthTestUser(app: Express, roles: string[] = ['user'], scope: string = 'openid profile email offline_access') {
    const email = randomEmail(roles.includes('admin') ? 'admin-oauth' : 'user-oauth');
    const password = 'OAuthPassword!123';
    
    const { response: registerResponse } = await registerUser(app, email, password, 'OAuth Test User', roles);
    
    // Inicia sesión después de registrar para obtener un token de acceso
    const session = await loginUser(app, email, password);
  
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
    const redirect = new URL(location);
    const code = redirect.searchParams.get('code');
    
    return { email, password, code, verifier, challenge, state, registerResponse };
}

export async function getOauthTestUser(email: string, tenantId: string = DEFAULT_TENANT) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
    return result.rows[0];
}
