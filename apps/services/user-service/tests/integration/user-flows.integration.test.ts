import request from 'supertest';
import app from '../../app';
import '../setup';

describe('Flujo de integración: usuario', () => {
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
    expect(getRes.body.user.password).toBeUndefined(); // Password should not be returned

    // Listar usuarios
    const listRes = await request(app).get('/users');
    expect(listRes.status).toBe(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0].email).toBe('flow@demo.com');

    // Actualizar usuario
    const updateRes = await request(app)
      .put(`/users/${userId}`)
      .send({ name: 'FlowUserUpdated', email: 'flowupdated@demo.com' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.name).toBe('FlowUserUpdated');
    expect(updateRes.body.user.email).toBe('flowupdated@demo.com');

    // Eliminar usuario
    const deleteRes = await request(app)
      .delete(`/users/${userId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.id).toBe(userId);

    // Consultar usuario eliminado
    const getDeletedRes = await request(app)
      .get(`/users/${userId}`);
    expect(getDeletedRes.status).toBe(404);

    // Verificar que la lista esté vacía
    const listEmptyRes = await request(app).get('/users');
    expect(listEmptyRes.status).toBe(200);
    expect(listEmptyRes.body.items).toHaveLength(0);
  });
});
