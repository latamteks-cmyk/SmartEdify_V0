// ...existing code...
import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';

import { app } from '../../cmd/server/main';
// import pool from '../../internal/adapters/db/pg.adapter';
import redis from '../../internal/adapters/redis/redis.adapter';

describe('Cadena de rotaciones de refresh token', () => {
  beforeEach(async () => {
    await (redis as any).flushdb?.();
  });

  it('realiza 3 rotaciones y los dos refresh anteriores quedan invalidados', async () => {
    const email = `chain_${Date.now()}@demo.com`;
    // Registro
    const regRes = await request(app)
      .post('/register')
      .send({ email, password: 'ChainPass123', name: 'ChainUser', tenant_id: 'default' });
    expect(regRes.status).toBe(201);

    // Login inicial
    const loginRes = await request(app)
      .post('/login')
      .send({ email, password: 'ChainPass123', tenant_id: 'default' });
    expect(loginRes.status).toBe(200);
    let currentRefresh = loginRes.body.refresh_token;
    const oldRefreshes: string[] = [currentRefresh];

    // 3 rotaciones
    for (let i = 0; i < 3; i++) {
      const rotateRes = await request(app).post('/refresh-token').send({ refresh_token: currentRefresh });
      expect(rotateRes.status).toBe(200);
      currentRefresh = rotateRes.body.refresh_token;
      oldRefreshes.push(currentRefresh);
    }

    // Intentar reusar cualquiera de los primeros 3 refresh (excluyendo el último actual)
    for (let i = 0; i < oldRefreshes.length - 1; i++) {
      const reuse = await request(app).post('/refresh-token').send({ refresh_token: oldRefreshes[i] });
      expect(reuse.status).toBe(401);
    }
  });
});
