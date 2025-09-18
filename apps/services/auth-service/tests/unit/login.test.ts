import request from 'supertest';

import app from '../app.test';
import { loginSuccessCounter, loginFailCounter } from '../../cmd/server/main';

async function counterValue(counter: { get: () => Promise<{ values: Array<{ value: number }> }>; reset: () => void }): Promise<number> {
  const snapshot = await counter.get();
  if (!snapshot || !Array.isArray(snapshot.values) || snapshot.values.length === 0) {
    return 0;
  }
  return snapshot.values[0]?.value ?? 0;
}

describe('POST /login', () => {
  beforeEach(() => {
    loginSuccessCounter.reset();
    loginFailCounter.reset();
  });

  // Uso de mock pg in-memory global; no limpiar memory local obsoleta
  it('debe aceptar login válido', async () => {
    const email = `user_${Date.now()}@demo.com`;
    await request(app)
      .post('/register')
      .send({ email, password: '12345678', name: 'Test User' });
    const res = await request(app)
      .post('/login')
      .send({ email, password: '12345678' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login exitoso');
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
  await expect(counterValue(loginSuccessCounter)).resolves.toBeGreaterThanOrEqual(1);
  });

  it('incrementa métrica de fallos con credenciales incorrectas', async () => {
    const email = `user_fail_${Date.now()}@demo.com`;
    await request(app)
      .post('/register')
      .send({ email, password: 'ValidPass123', name: 'Fail User' });
    const res = await request(app)
      .post('/login')
      .send({ email, password: 'WrongPass123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  await expect(counterValue(loginFailCounter)).resolves.toBeGreaterThanOrEqual(1);
  });

  it('debe rechazar login inválido', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'bademail', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
  });
});
