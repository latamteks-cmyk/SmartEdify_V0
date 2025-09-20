
import request from 'supertest';
import app from '../../app';
import { createAdminToken, createUserToken } from '../helpers/auth.helper';
import '../setup';

describe('DELETE /users/:id', () => {
  it('debe eliminar usuario con token de admin', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });

    const adminToken = createAdminToken('admin-123', 'admin@demo.com');

    const res = await request(app)
      .delete('/users/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Usuario eliminado');
    expect(res.body.id).toBe('1');
  });

  it('debe retornar 401 sin token', async () => {
    const res = await request(app).delete('/users/1');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing or invalid authorization header');
  });

  it('debe retornar 403 cuando usuario no-admin intenta eliminar', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });

    const userToken = createUserToken('1', 'test@demo.com');

    const res = await request(app)
      .delete('/users/1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Role 'admin' required");
  });
});
