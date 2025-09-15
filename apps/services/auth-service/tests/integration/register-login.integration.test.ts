import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';
import { app } from '../../cmd/server/main';
import pool from '../../internal/adapters/db/pg.adapter';
import redis from '../../internal/adapters/redis/redis.adapter';


describe('Flujo de integración: registro y login', () => {
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await (redis as any).flushdb?.();
  });

  it('debe registrar y luego permitir login', async () => {
    const email = `flow_${Date.now()}@demo.com`;
    const regRes = await request(app)
      .post('/register')
      .send({ email, password: 'flowpass123', name: 'FlowUser', tenant_id: 'default' });
    expect(regRes.status).toBe(201);
    expect(regRes.body.message).toBe('Usuario registrado');
    const loginRes = await request(app)
      .post('/login')
      .send({ email, password: 'flowpass123', tenant_id: 'default' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.message).toBe('Login exitoso');
    expect(loginRes.body.access_token).toBeDefined();
    expect(loginRes.body.refresh_token).toBeDefined();
  });
});
