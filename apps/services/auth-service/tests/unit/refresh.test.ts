import request from 'supertest';
import app from '../app.test';

/**
 * Escenario: cadena de refresh.
 * 1. Registrar y loguear => access + refresh
 * 2. POST /refresh-token con refresh válido => nuevo par
 * 3. Reutilizar refresh original => 401
 * 4. Verificar que access original sigue verificable hasta expirar (solo status 200 de endpoint protegido si existiera; aquí comprobamos estructura)
 */

describe('POST /refresh-token chain', () => {
  it('rota un refresh token y bloquea reutilización', async () => {
    const email = `refresh_${Date.now()}@demo.com`;
    // Registro
    await request(app)
      .post('/register')
      .send({ email, password: '12345678', name: 'Demo Refresh' })
      .expect(201);
    // Login inicial
    const loginRes = await request(app)
      .post('/login')
      .send({ email, password: '12345678' })
      .expect(200);
    const firstAccess = loginRes.body.access_token;
    const firstRefresh = loginRes.body.refresh_token;
    expect(firstAccess).toBeTruthy();
    expect(firstRefresh).toBeTruthy();

    // Primera rotación
    const rotateRes = await request(app)
      .post('/refresh-token')
      .send({ refresh_token: firstRefresh })
      .expect(200);
    const secondAccess = rotateRes.body.access_token;
    const secondRefresh = rotateRes.body.refresh_token;
    expect(secondAccess).toBeTruthy();
    expect(secondRefresh).toBeTruthy();
    expect(secondAccess).not.toEqual(firstAccess);
    expect(secondRefresh).not.toEqual(firstRefresh);

    // Reutilización del refresh original debe fallar
    await request(app)
      .post('/refresh-token')
      .send({ refresh_token: firstRefresh })
      .expect(401);

    // Opcional: segunda reutilización del nuevo también se bloquea tras usarlo
    const rotateAgain = await request(app)
      .post('/refresh-token')
      .send({ refresh_token: secondRefresh })
      .expect(200);
    const thirdRefresh = rotateAgain.body.refresh_token;
    await request(app)
      .post('/refresh-token')
      .send({ refresh_token: secondRefresh })
      .expect(401);
    expect(thirdRefresh).toBeTruthy();
  });
});
