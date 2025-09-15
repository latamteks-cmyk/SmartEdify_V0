import { clearDb } from '../../internal/adapters/db/memory';
import request from 'supertest';
import app from '../app.test';

describe('POST /reset-password', () => {
  beforeEach(() => { clearDb(); });
  it('debe aceptar datos válidos (flujo completo)', async () => {
    // Registrar usuario
    const email = `reset_${Date.now()}@demo.com`;
    const registerRes = await request(app)
      .post('/register')
      .send({ email, password: 'oldpass12', name: 'Test User' });
    expect(registerRes.status).toBe(201);
    // Recuperar contraseña (obtener token)
    const forgotRes = await request(app)
      .post('/forgot-password')
      .send({ email });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.token).toBeDefined();
    // Cambiar contraseña usando el token
    const res = await request(app)
      .post('/reset-password')
      .send({ token: forgotRes.body.token, newPassword: '12345678' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Contraseña actualizada');
  });

  it('debe rechazar datos inválidos', async () => {
    const res = await request(app)
      .post('/reset-password')
      .send({ token: 'bad', newPassword: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
  });
});
