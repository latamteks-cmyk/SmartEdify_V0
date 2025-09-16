import request from 'supertest';

import app from '../app.test';

describe('POST /login', () => {
  // Uso de mock pg in-memory global; no limpiar memory local obsoleta
  it('debe aceptar login válido', async () => {
    const email = `user_${Date.now()}@demo.com`;
    await request(app)
      .post('/register')
      .send({ email, password: '12345678', name: 'Test User' });
    const res = await request(app)
      .post('/login')
      .send({ email, password: '12345678' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login exitoso');
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
  });

  it('debe rechazar login inválido', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'bademail', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
  });
});
