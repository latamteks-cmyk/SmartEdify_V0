import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';
import { app } from '../../cmd/server/main';
import pool from '../../internal/adapters/db/pg.adapter';
import redis from '../../internal/adapters/redis/redis.adapter';
import { __resetKeyCacheForTests } from '../../internal/security/keys';
import { adminRateLimiter } from '../../internal/middleware/rate-limit';

describe('Middleware administrativo', () => {
  const headerName = process.env.AUTH_ADMIN_API_HEADER || 'x-admin-api-key';
  const adminKey = process.env.AUTH_ADMIN_API_KEY as string;
  const rateLimitKeys = ['::ffff:127.0.0.1', '127.0.0.1'];

  if (!adminKey) {
    throw new Error('AUTH_ADMIN_API_KEY debe configurarse para las pruebas de integración');
  }

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE auth_signing_keys RESTART IDENTITY CASCADE');
    await (redis as any).flushdb?.();
    __resetKeyCacheForTests();
    rateLimitKeys.forEach(key => {
      (adminRateLimiter as any).resetKey?.(key);
    });
  });

  afterEach(() => {
    rateLimitKeys.forEach(key => {
      (adminRateLimiter as any).resetKey?.(key);
    });
  });

  it.each([
    ['/admin/rotate-keys', undefined],
    ['/admin/revoke-kid', { kid: 'demo' }]
  ])('retorna 401 sin credencial en %s', async (path, payload) => {
    const agent = request(app).post(path);
    const response = payload ? await agent.send(payload) : await agent.send();
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('admin_auth_required');
  });

  it('retorna 403 si la credencial es inválida', async () => {
    const res = await request(app)
      .post('/admin/rotate-keys')
      .set(headerName, 'credencial-invalida');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('admin_auth_invalid');
  });

  it('permite acceder cuando la credencial es válida', async () => {
    const res = await request(app)
      .post('/admin/rotate-keys')
      .set(headerName, adminKey);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('rotated');
  });

  it('aplica rate limiting y responde 429 cuando se excede el límite', async () => {
    const baseRequest = () =>
      request(app)
        .post('/admin/rotate-keys')
        .set(headerName, adminKey);

    const first = await baseRequest();
    expect(first.status).toBe(200);

    const second = await baseRequest();
    expect(second.status).toBe(429);
    expect(second.body.error).toBe('admin_rate_limited');
  });
});
