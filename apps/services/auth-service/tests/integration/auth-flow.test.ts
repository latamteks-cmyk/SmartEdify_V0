import request from 'supertest';
import { app } from '../../cmd/server/main';
import pool from '../../internal/adapters/db/pg.adapter';

// Nota: reutilizamos la app exportada. No levantamos server real.
// Aseguramos limpieza básica de usuario de prueba antes de iniciar.
const TEST_EMAIL = 'integration@demo.com';
const TEST_TENANT = 'default';

async function cleanup() {
  try { await pool.query('DELETE FROM users WHERE email=$1 AND tenant_id=$2', [TEST_EMAIL, TEST_TENANT]); } catch {}
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  try { await pool.end(); } catch {}
});

describe('Flujo de autenticación completo', () => {
  let refreshToken: string | null = null;
  let accessToken: string | null = null;

  test('register -> 201', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: TEST_EMAIL, password: 'S3gur0_P@ss', name: 'Test User', tenant_id: TEST_TENANT });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });

  test('login -> 200 y tokens', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: TEST_EMAIL, password: 'S3gur0_P@ss', tenant_id: TEST_TENANT });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  test('refresh-token -> rota y entrega nuevo par', async () => {
    const res = await request(app)
      .post('/refresh-token')
      .send({ refresh_token: refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.access_token).toBeDefined();
    // Reuso inmediato del anterior debe fallar por reuse detection
    const reuse = await request(app)
      .post('/refresh-token')
      .send({ refresh_token: refreshToken });
    expect(reuse.status).toBe(401);
    // Actualizamos referencia al nuevo para futuras pruebas si hiciera falta
    refreshToken = res.body.refresh_token;
  });

  test('roles -> static list', async () => {
    const res = await request(app).get('/roles');
    expect(res.status).toBe(200);
    expect(res.body.roles).toContain('admin');
  });

  test('permissions -> static list', async () => {
    const res = await request(app).get('/permissions');
    expect(res.status).toBe(200);
    expect(res.body.permissions).toContain('read');
  });
});
