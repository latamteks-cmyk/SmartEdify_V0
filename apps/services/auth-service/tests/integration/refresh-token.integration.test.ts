// ...existing code...
import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';

import { app } from '../../cmd/server/main';
// import pool from '../../internal/adapters/db/pg.adapter';
import redis from '../../internal/adapters/redis/redis.adapter';

/**
 * Objetivo: validar que al rotar un refresh token:
 * 1. Se emite un nuevo par access/refresh distinto.
 * 2. El refresh anterior ya no puede volver a usarse (recibe 401).
 */

describe('Rotación de refresh token', () => {
  beforeEach(async () => {
    await (redis as any).flushdb?.();
  });

  it('debe rotar el refresh token e invalidar el anterior', async () => {
    const email = `refresh_${Date.now()}@demo.com`;
    // Registro
    const regRes = await request(app)
      .post('/register')
      .send({ email, password: 'RefreshPass123', name: 'RefreshUser', tenant_id: 'default' });
    expect(regRes.status).toBe(201);

    // Login inicial
    const loginRes = await request(app)
      .post('/login')
      .send({ email, password: 'RefreshPass123', tenant_id: 'default' });
    expect(loginRes.status).toBe(200);
    const oldRefresh = loginRes.body.refresh_token;
    const oldAccess = loginRes.body.access_token;

    // Primera rotación
    const rotateRes = await request(app)
      .post('/refresh-token')
      .send({ refresh_token: oldRefresh });
    expect(rotateRes.status).toBe(200);
    const newRefresh = rotateRes.body.refresh_token;
    const newAccess = rotateRes.body.access_token;
    expect(newRefresh).toBeDefined();
    expect(newAccess).toBeDefined();
    expect(newRefresh).not.toBe(oldRefresh);
    expect(newAccess).not.toBe(oldAccess);

    // Reutilización del refresh antiguo debe fallar
    const reuseRes = await request(app)
      .post('/refresh-token')
      .send({ refresh_token: oldRefresh });
    // Implementación actual: si no hay invalidación explícita podría aún aceptarlo.
    // Este test define el criterio esperado (401). Si falla, ajustaremos la lógica en rotateRefresh.
    expect(reuseRes.status).toBe(401);
  });
});
