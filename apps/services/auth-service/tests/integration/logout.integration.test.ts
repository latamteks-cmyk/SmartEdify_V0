// Eliminado mock inline de pg.adapter para usar el mock global
import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';

import { app } from '../../cmd/server/main';
// import pool from '../../internal/adapters/db/pg.adapter';
import redis from '../../internal/adapters/redis/redis.adapter';

describe('Flujo de logout', () => {
  beforeEach(async () => {
    await (redis as any).flushdb?.();
  });

  it('revoca refresh token y bloquea reuso', async () => {
    const email = `logout_${Date.now()}@demo.com`;
    await request(app)
      .post('/register')
      .send({ email, password: 'LogoutPass123', name: 'LogoutUser', tenant_id: 'default' });
    const loginRes = await request(app)
      .post('/login')
      .send({ email, password: 'LogoutPass123', tenant_id: 'default' });
    expect(loginRes.status).toBe(200);
    const refresh = loginRes.body.refresh_token;
    const logoutRes = await request(app)
      .post('/logout')
      .send({ token: refresh });
    expect(logoutRes.status).toBe(204);
    const reuse = await request(app)
      .post('/refresh-token')
      .send({ refresh_token: refresh });
    expect(reuse.status).toBe(401);
  });
});
