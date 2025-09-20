
import request from 'supertest';
import app from '../../app';
import { createUserToken, createAdminToken } from '../helpers/auth.helper';
import '../setup';

describe('GET /users/:id', () => {
  it('debe obtener usuario por id con token de usuario propietario', async () => {
    // Create user first
    const createRes = await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });
    
    const userToken = createUserToken('1', 'test@demo.com');
    
    const res = await request(app)
      .get('/users/1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe('1');
    expect(res.body.user.password).toBeUndefined(); // Password should not be returned
  });

  it('debe obtener usuario por id con token de admin', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });
    
    const adminToken = createAdminToken('admin-123', 'admin@demo.com');
    
    const res = await request(app)
      .get('/users/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe('1');
  });

  it('debe retornar 401 sin token', async () => {
    const res = await request(app).get('/users/1');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing or invalid authorization header');
  });

  it('debe retornar 403 cuando usuario intenta acceder a otro perfil', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });
    
    const otherUserToken = createUserToken('other-user', 'other@demo.com');
    
    const res = await request(app)
      .get('/users/1')
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Access denied');
  });
});
