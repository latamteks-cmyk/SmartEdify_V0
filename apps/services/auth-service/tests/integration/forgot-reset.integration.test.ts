import request from 'supertest';
import { app } from '../../cmd/server/main';
import pool from '../../internal/adapters/db/pg.adapter';
import redis from '../../internal/adapters/redis/redis.adapter';

describe('Flujo de integración: recuperación y cambio de contraseña', () => {
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await (redis as any).flushdb?.();
  });

  it('retorna 404 si el usuario no existe para recuperación', async () => {
    const response = await request(app)
      .post('/forgot-password')
      .send({ email: 'notfound@demo.com', tenant_id: 'default' });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Usuario no encontrado');
  });

  it('debe registrar usuario, solicitar recuperación y luego cambiar la contraseña', async () => {
    const email = `flow_${Date.now()}@demo.com`;
    await request(app)
      .post('/register')
      .send({ email, password: 'flowpass123', name: 'FlowUser', tenant_id: 'default' });
    const forgotRes = await request(app)
      .post('/forgot-password')
      .send({ email, tenant_id: 'default' });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.message).toBe('Email enviado');
    expect(forgotRes.body.token).toBeDefined();
    const resetRes = await request(app)
      .post('/reset-password')
      .send({ token: forgotRes.body.token, newPassword: 'nuevoPass123' });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toBe('Contraseña actualizada');
  });

  it('rechaza tokens inválidos o reutilizados en el flujo de reset', async () => {
    const email = `retry_${Date.now()}@demo.com`;
    await request(app)
      .post('/register')
      .send({ email, password: 'flowpass123', name: 'RetryUser', tenant_id: 'default' });

    const forgotRes = await request(app)
      .post('/forgot-password')
      .send({ email, tenant_id: 'default' });
    expect(forgotRes.status).toBe(200);
    const token = forgotRes.body.token as string;
    expect(typeof token).toBe('string');

    const invalid = await request(app)
      .post('/reset-password')
      .send({ token: 'reset-inexistente', newPassword: 'Nuevo12345' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Token inválido o expirado');

    const firstReset = await request(app)
      .post('/reset-password')
      .send({ token, newPassword: 'Cambio12345' });
    expect(firstReset.status).toBe(200);

    const reuse = await request(app)
      .post('/reset-password')
      .send({ token, newPassword: 'Cambio67890' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error).toBe('Token inválido o expirado');
  });
});
