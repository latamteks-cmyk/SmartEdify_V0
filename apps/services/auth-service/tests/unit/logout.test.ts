import request from 'supertest';
import app from '../app.test';

describe('POST /logout', () => {
  it('debe aceptar logout válido', async () => {
    const res = await request(app)
      .post('/logout')
      .send({ token: 'validtoken12345' });
    expect(res.status).toBe(204);
  });

  it('debe rechazar logout inválido', async () => {
    const res = await request(app)
      .post('/logout')
      .send({ token: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
  });
});
