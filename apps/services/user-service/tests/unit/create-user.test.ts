import request from 'supertest';
import app from '../../app';
import '../setup';

describe('POST /users', () => {
  it('debe crear usuario válido', async () => {
    const res = await request(app)
      .post('/users')
      .send({ email: 'nuevo@demo.com', name: 'Nuevo', password: '12345678' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Usuario creado');
    expect(res.body.user.email).toBe('nuevo@demo.com');
  });

  it('debe rechazar usuario duplicado', async () => {
    // Create first user
    await request(app)
      .post('/users')
      .send({ email: 'duplicado@demo.com', name: 'Primero', password: '12345678' });

    // Try to create duplicate
    const res = await request(app)
      .post('/users')
      .send({ email: 'duplicado@demo.com', name: 'Segundo', password: '12345678' });
    
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('User with this email already exists');
  });
});
