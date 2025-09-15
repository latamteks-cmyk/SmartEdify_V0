
import request from 'supertest';
import app from '../../app';
import { clearDb } from '../../internal/adapters/db/memory';

describe('PUT /users/:id', () => {
  beforeEach(async () => {
    clearDb();
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });
  });
  it('debe actualizar usuario', async () => {
    const res = await request(app)
      .put('/users/1')
      .send({ name: 'Actualizado', email: 'actualizado@demo.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Usuario actualizado');
    expect(res.body.user.name).toBe('Actualizado');
  });
});
