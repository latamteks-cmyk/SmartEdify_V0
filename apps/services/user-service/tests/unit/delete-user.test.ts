
import request from 'supertest';
import app from '../../app';
import '../setup';

describe('DELETE /users/:id', () => {
  it('debe eliminar usuario', async () => {
    // Create user first
    await request(app)
      .post('/users')
      .send({ id: '1', name: 'Test', email: 'test@demo.com', password: '1234' });

    const res = await request(app)
      .delete('/users/1');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Usuario eliminado');
    expect(res.body.id).toBe('1');
  });

  it('debe retornar 404 para usuario inexistente', async () => {
    const res = await request(app).delete('/users/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario no encontrado');
  });
});
