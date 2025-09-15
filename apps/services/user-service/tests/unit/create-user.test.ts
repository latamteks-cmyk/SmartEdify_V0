import request from 'supertest';
import app from '../../app';

describe('POST /users', () => {
  it('debe crear usuario válido', async () => {
    const res = await request(app)
      .post('/users')
      .send({ email: 'nuevo@demo.com', name: 'Nuevo', password: '12345678' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Usuario creado');
    expect(res.body.user.email).toBe('nuevo@demo.com');
  });
});
