import request from 'supertest';
import app from '../app.test';

/**
 * Escenarios cubiertos:
 * 1. Flujo feliz: register -> forgot-password -> reset-password -> login con nueva OK, login con vieja falla.
 * 2. Email inexistente en forgot => 404.
 * 3. Token inválido en reset => 400.
 * 4. Reutilización de token (doble reset) => 400 en segundo intento.
 */

describe('Password recovery flow', () => {
  it('flujo completo de recuperación y cambio de contraseña', async () => {
    const email = `pwd_${Date.now()}@demo.com`;
    const originalPassword = 'OrigPass123!';
    const newPassword = 'NewPass456!';

    // Registro
    await request(app)
      .post('/register')
      .send({ email, password: originalPassword, name: 'User PWD' })
      .expect(201);

    // Forgot password => obtiene token (simula email)
    const forgotRes = await request(app)
      .post('/forgot-password')
      .send({ email })
      .expect(200);
    expect(forgotRes.body.token).toMatch(/^reset-/);
    const token = forgotRes.body.token;

    // Reset password
    await request(app)
      .post('/reset-password')
      .send({ token, newPassword })
      .expect(200);

    // Login con password nueva OK
    await request(app)
      .post('/login')
      .send({ email, password: newPassword })
      .expect(200);

    // Login con password antigua ahora debe fallar
    await request(app)
      .post('/login')
      .send({ email, password: originalPassword })
      .expect(401);
  });

  it('forgot-password con email inexistente retorna 404', async () => {
    const res = await request(app)
      .post('/forgot-password')
      .send({ email: 'noexiste_'+Date.now()+'@demo.com' });
    expect([404]).toContain(res.status); // Handler retorna 404
  });

  it('reset-password con token inválido retorna 400', async () => {
    const res = await request(app)
      .post('/reset-password')
      .send({ token: 'reset-invalido-'+Date.now(), newPassword: 'Whatever123!' });
    expect(res.status).toBe(400);
  });

  it('no permite reutilizar token de reset (consumo único)', async () => {
    const email = `reuse_${Date.now()}@demo.com`;
    // Registro
    await request(app)
      .post('/register')
      .send({ email, password: 'Password1!', name: 'Reuse' })
      .expect(201);
    // Forgot
    const fr = await request(app)
      .post('/forgot-password')
      .send({ email })
      .expect(200);
    const token = fr.body.token;
    // Primer uso OK
    await request(app)
      .post('/reset-password')
      .send({ token, newPassword: 'Password2!' })
      .expect(200);
    // Segundo uso falla
    await request(app)
      .post('/reset-password')
      .send({ token, newPassword: 'Password3!' })
      .expect(400);
  });
});
