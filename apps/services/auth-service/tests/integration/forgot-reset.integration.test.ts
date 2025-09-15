import request from 'supertest';
import { app } from '../../cmd/server/main';
import pool from '../../internal/adapters/db/pg.adapter';
import redis from '../../internal/adapters/redis/redis.adapter';

describe('Flujo de integración: recuperación y cambio de contraseña', () => {
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await (redis as any).flushdb?.();
  });
  it('debe registrar usuario, solicitar recuperación y luego cambiar la contraseña', async () => {
    const email = `flow_${Date.now()}@demo.com`;
    await request(app)
      .post('/register')
      .send({ email, password: 'flowpass123', name: 'FlowUser' });
    const forgotRes = await request(app)
      .post('/forgot-password')
      .send({ email });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.message).toBe('Email enviado');
    expect(forgotRes.body.token).toBeDefined();
    const resetRes = await request(app)
      .post('/reset-password')
      .send({ token: forgotRes.body.token, newPassword: 'nuevoPass123' });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toBe('Contraseña actualizada');
  });
});
