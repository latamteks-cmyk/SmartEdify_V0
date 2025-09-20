
import request from 'supertest';
import app from '../../app';
import { createUserToken, createAdminToken } from '../helpers/auth.helper';
import '../setup';

describe('PUT /users/:id', () => {
  it('debe actualizar usuario con token de propietario', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });

    const userToken = createUserToken('1', 'test@demo.com');

    const res = await request(app)
      .put('/users/1')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Actualizado', email: 'actualizado@demo.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Usuario actualizado');
    expect(res.body.user.name).toBe('Actualizado');
    expect(res.body.user.email).toBe('actualizado@demo.com');
  });

  it('debe actualizar usuario con token de admin', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });

    const adminToken = createAdminToken('admin-123', 'admin@demo.com');

    const res = await request(app)
      .put('/users/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Actualizado Admin', email: 'admin-updated@demo.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Usuario actualizado');
    expect(res.body.user.name).toBe('Actualizado Admin');
  });

  it('debe retornar 401 sin token', async () => {
    const res = await request(app)
      .put('/users/1')
      .send({ name: 'Test', email: 'test@demo.com' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing or invalid authorization header');
  });

  it('debe retornar 403 cuando usuario intenta actualizar otro perfil', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });

    const otherUserToken = createUserToken('other-user', 'other@demo.com');

    const res = await request(app)
      .put('/users/1')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ name: 'Hacker', email: 'hacker@demo.com' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Access denied');
  });
});
