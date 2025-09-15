import request from 'supertest';
import app from '../../app';
import { clearDb } from '../../internal/adapters/db/memory';

describe('Flujo de integración: usuario', () => {
  beforeEach(() => { clearDb(); });
  it('debe crear, consultar, actualizar y eliminar usuario', async () => {
    // Crear usuario
    const createRes = await request(app)
      .post('/users')
      .send({ email: 'flow@demo.com', name: 'FlowUser', password: 'flowpass123' });
    expect(createRes.status).toBe(201);
    const userId = createRes.body.user.id;

    // Consultar usuario
    const getRes = await request(app)
      .get(`/users/${userId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.user.email).toBe('flow@demo.com');

    // Actualizar usuario
    const updateRes = await request(app)
      .put(`/users/${userId}`)
      .send({ name: 'FlowUserUpdated', email: 'flowupdated@demo.com' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.name).toBe('FlowUserUpdated');

    // Eliminar usuario
    const deleteRes = await request(app)
      .delete(`/users/${userId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.id).toBe(userId);

    // Consultar usuario eliminado
    const getDeletedRes = await request(app)
      .get(`/users/${userId}`);
    expect(getDeletedRes.status).toBe(404);
  });
});
