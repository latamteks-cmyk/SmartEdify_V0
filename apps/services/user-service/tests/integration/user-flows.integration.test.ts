import request from 'supertest';
import app from '../../app';
import { createAdminToken, createUserToken } from '../helpers/auth.helper';
import '../setup';

describe('Flujo de integración: usuario', () => {
  it('debe crear, consultar, actualizar y eliminar usuario con autenticación', async () => {
    // Crear usuario (público)
    const createRes = await request(app)
      .post('/users')
      .send({ email: 'flow@demo.com', name: 'FlowUser', password: 'flowpass123' });
    expect(createRes.status).toBe(201);
    const userId = createRes.body.user.id;

    // Crear tokens
    const userToken = createUserToken(userId, 'flow@demo.com');
    const adminToken = createAdminToken('admin-123', 'admin@demo.com');

    // Consultar usuario (como propietario)
    const getRes = await request(app)
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.user.email).toBe('flow@demo.com');
    expect(getRes.body.user.password).toBeUndefined(); // Password should not be returned

    // Listar usuarios (como admin)
    const listRes = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0].email).toBe('flow@demo.com');

    // Actualizar usuario (como propietario)
    const updateRes = await request(app)
      .put(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'FlowUserUpdated', email: 'flowupdated@demo.com' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.name).toBe('FlowUserUpdated');
    expect(updateRes.body.user.email).toBe('flowupdated@demo.com');

    // Eliminar usuario (como admin)
    const deleteRes = await request(app)
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.id).toBe(userId);

    // Consultar usuario eliminado (como admin)
    const getDeletedRes = await request(app)
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getDeletedRes.status).toBe(404);

    // Verificar que la lista esté vacía (como admin)
    const listEmptyRes = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listEmptyRes.status).toBe(200);
    expect(listEmptyRes.body.items).toHaveLength(0);
  });
});
