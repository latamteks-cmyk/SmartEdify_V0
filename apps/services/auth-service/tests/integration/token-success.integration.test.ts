import request from 'supertest';
import { Express } from 'express';
import { app } from '../../cmd/server/main';
import { getAuthCode, registerUser } from '../utils/auth-helpers';
import { shutdownTracing } from '../../internal/observability/tracing';
import { clearAllStores } from '../../internal/adapters/redis/redis.adapter';
import { pool } from '../../internal/adapters/db/pg.adapter';

// --- Test Setup ---
let server: Express;

async function bootstrap() {
  return app;
}

async function reset() {
  await pool.query(`DELETE FROM users WHERE email LIKE '%@example.com' OR email LIKE '%@demo.com'`);
  await clearAllStores();
}
// --- End Test Setup ---

describe('POST /token - Success Flows', () => {
  beforeAll(async () => {
    server = await bootstrap();
    await reset();
  });

  afterAll(async () => {
    await shutdownTracing();
    await pool.end();
    // if (redisClient && redisClient.isOpen) {
    //   await redisClient.quit();
    // }
  });

  describe('Authorization Code Flow', () => {
    const user = {
      email: 'token-success-test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    let authCodePayload: Awaited<ReturnType<typeof getAuthCode>>;

    beforeAll(async () => {
      const registerResult = await registerUser(server, user.email, user.password, user.name);
      expect(registerResult.response.status).toBe(201);

      authCodePayload = await getAuthCode({
        app: server,
        user,
        clientId: 'test-client-public',
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        pkce: true
      });
      expect(authCodePayload).toBeDefined();
      expect(authCodePayload.code).toBeDefined();
    });

    it('should return a token pair and id_token for a valid authorization code', async () => {
      const response = await request(server)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCodePayload.code,
          client_id: 'test-client-public',
          redirect_uri: 'http://localhost:3000/callback',
          code_verifier: authCodePayload.codeVerifier
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('id_token');
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.scope).toContain('openid');

      // const idToken = decodeJwt(response.body.id_token);
      // expect(idToken.email).toBe(user.email);
      // expect(idToken.name).toBe(user.name);
    });
  });

  describe('Refresh Token Flow', () => {
    const user = {
      email: 'token-refresh-test@example.com',
      password: 'password123',
      name: 'Refresh User'
    };
    let refreshToken: string;

    beforeAll(async () => {
      const registerResult = await registerUser(server, user.email, user.password, user.name);
      expect(registerResult.response.status).toBe(201);

      const authCodePayload = await getAuthCode({
        app: server,
        user,
        clientId: 'test-client',
        scopes: ['openid', 'offline_access'],
        pkce: true
      });

      const tokenResponse = await request(server)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCodePayload.code,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
          code_verifier: authCodePayload.codeVerifier
        });
      
      refreshToken = tokenResponse.body.refresh_token;
      expect(refreshToken).toBeDefined();
    });

    it('should return a new token pair for a valid refresh token', async () => {
      const response = await request(server)
        .post('/token')
        .send({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: 'test-client',
          client_secret: 'test-secret'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.refresh_token).not.toBe(refreshToken); // Ensure rotation
      expect(response.body.token_type).toBe('Bearer');
    });
  });
});
