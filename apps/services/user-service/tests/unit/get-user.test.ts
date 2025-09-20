
import request from 'supertest';
import app from '../../app';
import '../setup';

describe('GET /users/:id', () => {
  it('debe obtener usuario por id', async () => {
    // Create user first
    const createRes = await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });
    
    const res = await request(app)
      .get('/users/1');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe('1');
    expect(res.body.user.password).toBeUndefined(); // Password should not be returned
  });

  it('debe retornar 404 para usuario inexistente', async () => {
    const res = await request(app).get('/users/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario no encontrado');
  });
});
