
import request from 'supertest';
import app from '../../app';
import { clearDb } from '../../internal/adapters/db/memory';

describe('DELETE /users/:id', () => {
  beforeEach(async () => {
    clearDb();
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });
  });
  it('debe eliminar usuario', async () => {
    const res = await request(app)
      .delete('/users/1');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Usuario eliminado');
    expect(res.body.id).toBe('1');
  });
});
