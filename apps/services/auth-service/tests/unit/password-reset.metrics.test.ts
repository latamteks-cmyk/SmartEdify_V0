import request from 'supertest';
import app from '../app.test';

/**
 * Validación de métricas de password reset.
 * Estrategia: capturamos snapshot de /metrics antes y después del flujo completo.
 * Aserciones:
 *  - auth_password_reset_requested_total incrementa en +1
 *  - auth_password_reset_completed_total incrementa en +1
 */
function extractMetric(body: string, name: string): number | null {
  // Formato prom-client: lines con 'name value' (ignorar HELP/TYPE)
  const regex = new RegExp(`^${name}\\s+(\\d+)`, 'm');
  const m = body.match(regex);
  if (!m) return null;
  return Number(m[1]);
}

describe('Metrics password reset', () => {
  it('incrementa counters requested y completed', async () => {
    // Snapshot inicial
    const m1 = await request(app).get('/metrics').expect(200);
    const startRequested = extractMetric(m1.text, 'auth_password_reset_requested_total') || 0;
    const startCompleted = extractMetric(m1.text, 'auth_password_reset_completed_total') || 0;

    const email = `metrics_${Date.now()}@demo.com`;
    await request(app).post('/register').send({ email, password: 'InitPass123', name: 'Metrics' }).expect(201);
    const forgotRes = await request(app).post('/forgot-password').send({ email }).expect(200);
    const token = forgotRes.body.token;
    await request(app).post('/reset-password').send({ token, newPassword: 'NewPass123!' }).expect(200);

    const m2 = await request(app).get('/metrics').expect(200);
    const endRequested = extractMetric(m2.text, 'auth_password_reset_requested_total') || 0;
    const endCompleted = extractMetric(m2.text, 'auth_password_reset_completed_total') || 0;

    expect(endRequested - startRequested).toBeGreaterThanOrEqual(1);
    expect(endCompleted - startCompleted).toBeGreaterThanOrEqual(1);
  });
});
