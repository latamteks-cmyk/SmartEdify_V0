import request from 'supertest';
import app from '../app.test';

describe('POST /register', () => {
  it('debe registrar usuario válido', async () => {
    const email = `reg_${Date.now()}@demo.com`;
    const res = await request(app)
      .post('/register')
      .send({ email, password: '12345678', name: 'Demo' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Usuario registrado');
  });

  it('debe rechazar datos inválidos', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'bademail', password: '123', name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
  });
});
