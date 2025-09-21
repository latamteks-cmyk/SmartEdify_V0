import request from 'supertest';
import { Express } from 'express';
import { app } from '../../cmd/server/main';
import { registerUser } from '../utils/auth-helpers';
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

describe('POST /login - Integration Tests', () => {
  const testUser = {
    email: 'login-test@example.com',
    password: 'password123',
    name: 'Login Test User'
  };

  beforeAll(async () => {
    server = await bootstrap();
    await reset();
    // Register a user to be used in the tests
    const registerResult = await registerUser(server, testUser.email, testUser.password, testUser.name);
    expect(registerResult.response.status).toBe(201);
  });

  afterAll(async () => {
    await shutdownTracing();
    await pool.end();
  });

  it('should return tokens for a valid user', async () => {
    const response = await request(server)
      .post('/login')
      .send({
        email: testUser.email,
        password: testUser.password,
        tenant_id: 'default'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login exitoso');
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
    expect(response.body.token_type).toBe('Bearer');
    expect(response.body.user.email).toBe(testUser.email);
  });

  it('should return 401 for a non-existent user', async () => {
    const response = await request(server)
      .post('/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
        tenant_id: 'default'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Credenciales inválidas');
  });

  it('should return 401 for an incorrect password', async () => {
    const response = await request(server)
      .post('/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
        tenant_id: 'default'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Credenciales inválidas');
  });

  it('should return 400 for missing email', async () => {
    const response = await request(server)
      .post('/login')
      .send({
        password: 'password123',
        tenant_id: 'default'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Datos inválidos');
  });
});
