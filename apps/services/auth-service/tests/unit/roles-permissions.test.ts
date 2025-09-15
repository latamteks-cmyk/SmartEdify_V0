import request from 'supertest';
import app from '../app.test';

describe('GET /roles', () => {
  it('debe devolver lista de roles', async () => {
    const res = await request(app).get('/roles');
    expect(res.status).toBe(200);
    expect(res.body.roles).toEqual(expect.arrayContaining(['admin', 'user', 'guest']));
  });
});

describe('GET /permissions', () => {
  it('debe devolver lista de permisos', async () => {
    const res = await request(app).get('/permissions');
    expect(res.status).toBe(200);
    expect(res.body.permissions).toEqual(expect.arrayContaining(['read', 'write', 'delete']));
  });
});
