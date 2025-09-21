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

describe('POST /token - Error Flows', () => {
  beforeAll(async () => {
    server = await bootstrap();
    await reset();
  });

  afterAll(async () => {
    await shutdownTracing();
    await pool.end();
  });

  describe('Authorization Code Flow Errors', () => {
    const user = {
      email: 'token-errors-test@demo.com',
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
        clientId: 'test-client',
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        pkce: true
      });
      expect(authCodePayload).toBeDefined();
      expect(authCodePayload.code).toBeDefined();
    });

    it('should return 400 for invalid grant_type', async () => {
      const response = await request(server)
        .post('/token')
        .send({
          grant_type: 'invalid_grant_type',
          client_id: 'test-client'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_request');
    });

    it('should return 400 for missing code when grant_type is authorization_code', async () => {
      const response = await request(server)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_request');
      expect(response.body.error_description).toBe('code requerido');
    });

    it('should return 400 for invalid code when grant_type is authorization_code', async () => {
      const response = await request(server)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: 'invalid_code',
          client_id: 'test-client',
          redirect_uri: 'http://localhost:3000/callback',
          code_verifier: authCodePayload.codeVerifier
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_grant');
      if (response.body.error_description) {
        expect(response.body.error_description).toBe('Authorization code is invalid, expired or already used');
      }
    });

    it('should return 400 for invalid code_verifier when grant_type is authorization_code', async () => {
      const response = await request(server)
        .post('/token')
        .send({
          grant_type: 'authorization_code',
          code: authCodePayload.code,
          client_id: 'test-client',
          client_secret: 'test-secret',
          redirect_uri: 'http://localhost:3000/callback',
          code_verifier: 'invalid_verifier'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_request');
    });
  });

  describe('Refresh Token Flow Errors', () => {
    it('should return 400 for missing refresh_token when grant_type is refresh_token', async () => {
      const response = await request(server)
        .post('/token')
        .send({
          grant_type: 'refresh_token',
          client_id: 'test-client',
          client_secret: 'test-secret'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_request');
      expect(response.body.error_description).toBe('refresh_token requerido');
    });

    it('should return 400 for invalid refresh_token', async () => {
      const response = await request(server)
        .post('/token')
        .send({
          grant_type: 'refresh_token',
          refresh_token: 'invalid-token',
          client_id: 'test-client',
          client_secret: 'test-secret'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_grant');
    });
  });
});
