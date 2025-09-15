
import request from 'supertest';
import app from '../../app';
import { clearDb } from '../../internal/adapters/db/memory';

describe('GET /users/:id', () => {
  beforeEach(async () => {
    clearDb();
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });
  });
  it('debe obtener usuario por id', async () => {
    const res = await request(app)
      .get('/users/1');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe('1');
  });
});
