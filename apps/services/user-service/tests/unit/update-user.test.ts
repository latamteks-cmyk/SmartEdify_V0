
import request from 'supertest';
import app from '../../app';
import '../setup';

describe('PUT /users/:id', () => {
  it('debe actualizar usuario', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });

    const res = await request(app)
      .put('/users/1')
      .send({ name: 'Actualizado', email: 'actualizado@demo.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Usuario actualizado');
    expect(res.body.user.name).toBe('Actualizado');
    expect(res.body.user.email).toBe('actualizado@demo.com');
  });

  it('debe retornar 404 para usuario inexistente', async () => {
    const res = await request(app)
      .put('/users/nonexistent-id')
      .send({ name: 'Test', email: 'test@demo.com' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario no encontrado');
  });
});
