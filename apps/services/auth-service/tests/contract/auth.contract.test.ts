import request from 'supertest';
import { app } from '../../cmd/server/main';
import { contractSnapshot } from './utils/snapshot';

const dbMock = require('../../internal/adapters/db/pg.adapter') as any;
const redisModule = require('../../internal/adapters/redis/redis.adapter');
const redis = redisModule.default;

const TENANT_ID = 'default';
const PASSWORD = 'ContractPass!123';

async function resetState() {
  if (typeof dbMock.__resetMock === 'function') {
    dbMock.__resetMock();
  }
  if (redis && typeof redis.flushdb === 'function') {
    await redis.flushdb();
  }
  const stores = ['__REFRESH_STORE__', '__AUTH_CODE_STORE__', '__PWDRESET_STORE__'];
  for (const key of stores) {
    const store = (global as any)[key];
    if (store && typeof store.clear === 'function') {
      store.clear();
    }
  }
}

async function registerUser(email: string, name = 'Contract User') {
  return request(app)
    .post('/register')
    .send({ email, password: PASSWORD, name, tenant_id: TENANT_ID });
}

describe('Auth contract snapshots', () => {
  beforeEach(async () => {
    process.env.AUTH_ADMIN_API_KEY = process.env.AUTH_ADMIN_API_KEY || 'test-admin-key';
    await resetState();
  });

  it('POST /register devuelve contrato estable', async () => {
    const response = await registerUser('contract.register@demo.com', 'Register User');
    expect(response.status).toBe(201);
    expect(contractSnapshot(response)).toMatchSnapshot('POST /register 201');
  });

  it('POST /login devuelve tokens en formato esperado', async () => {
    const email = 'contract.login@demo.com';
    await registerUser(email, 'Login User');
    const response = await request(app)
      .post('/login')
      .send({ email, password: PASSWORD, tenant_id: TENANT_ID });
    expect(response.status).toBe(200);
    expect(contractSnapshot(response)).toMatchSnapshot('POST /login 200');
  });

  it('POST /refresh-token rota el refresh token sin romper contrato', async () => {
    const email = 'contract.refresh@demo.com';
    await registerUser(email, 'Refresh User');
    const loginRes = await request(app)
      .post('/login')
      .send({ email, password: PASSWORD, tenant_id: TENANT_ID });
    expect(loginRes.status).toBe(200);
    const refreshToken: string | undefined = loginRes.body?.refresh_token;
    expect(typeof refreshToken).toBe('string');
    const response = await request(app)
      .post('/refresh-token')
      .send({ refresh_token: refreshToken });
    expect(response.status).toBe(200);
    expect(contractSnapshot(response)).toMatchSnapshot('POST /refresh-token 200');
  });

  it('GET /health reporta dependencias principales', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(contractSnapshot(response)).toMatchSnapshot('GET /health 200');
  });
});
