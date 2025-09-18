import request from 'supertest';

import '../setup';
import { app } from '../../cmd/server/main';

describe('GET /health', () => {
  it('debe responder 200 o 503 y contener campos esperados cuando deps OK/degraded', async () => {
    const res = await request(app).get('/health');
    expect([200,503]).toContain(res.status); // permitir degraded temporal
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('db');
    expect(res.body).toHaveProperty('redis');
    expect(res.body).toHaveProperty('uptime_s');
  });
});
