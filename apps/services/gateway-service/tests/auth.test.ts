import request from 'supertest';
import app from '../src/server';
import { config } from '../src/config/env';
import { SignJWT } from 'jose';
import { importPKCS8 } from 'jose';

// Mock JWKS for testing
const testPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDHRcr2QKPagPzp
GyIO5NWMZZkLVzGm04Bmzn9m9ewzazf6RGjkH4eCy8mfQlwHgcUJKyRhKiTpUec7
T6Ah+DsTF5pXydgRDL9T9qmj2Hktd1aw3mVZNeJItqAxWV7Zu1bM/j6WuGJi+jTO
EThZXWbmZF7LhjkpZQxOfdPaeBmjhMYJ3tu3KMn7o28HMuqpEOcExja9bpBlpoxG
PWptGy2k6ndxHgNK+xVIBGy/J36254OumJGz3mrNI/Z3xFUa9mxv+Hf0S/9Zp6zd
qLUf2bQAZowwHU+VlXDxBrRT1ik3P/KjicqvUpJ7/fkY9cZvtQef640iXw/cjTrI
HwlNU2GzAgMBAAECggEAEr0EM2gW22tik1Nap9XyrjaeclHSmvJodc1tG6ZjX8xP
ysQ8kte0QhqY9jmok/zaq8wkHxnrGJo1Uhts9AV+kbnMIWshuXyCn7uDRQ39bFrT
Yv9sxVPo7ered8hDXfve17qgeJRpmdgjS2/Z5EerABIaiuWw4vKR1Tna5nUfSYfF
+kF1+IBitc+TDc8cgGVLEfR1zVwUMwR2KKAV1PEn5KLF7XD/hoSdSXth3N1INeCS
MeST/Ioeq7xG/3USxJgrV5mJjQgmFMVa232YSZC2F2ywoSKIg9woQYGU+lMGOJ1G
J6kZqEUEP4bGsX0Ogx+IzYlQJyEq9QPgULFAYOgCeQKBgQD+iRzzCVHPdM4kDHrN
i7Odd+vIfj4VpX1bhu6XfS3TgErrLbg8Sm4tanAGrMgxEmaXccxUBfHNm3YmAmPY
3MXKLaXKQD94W2XjyBvx9mSML3uxTW6qoHZ3zd2VxgQ06AFWPbEQk6ZD1ijQTvYi
CVCqQ26C+6S1TPNE5pTHMTjAhwKBgQDHbMpv2YNorxDwdKxLhrGhSF1DsrrNeyQd
dlJj9/QkW2VOu0o5/4/lrMei7DgAh8APyFkpAEXlray5VikbkB5Ix6GxEZ8SIBvX
EWEFdiqx8xQeFCZJRpkTFCTUjQGiy69exNaAxxAf2iJGQI3bznUzm98JceB9olEW
zalJjwP6LwKBgDdOShL8PXxQKXYy1Q7SvfgOM8FDkUI4+TYRszD2csuw1rFdUTyi
Su559ylGdDVJbM0xJGczbGVcKx2CnIuL8/6esu1ShG5qFlJrVOocj6Edp7/tz7db
BhXR1w1QoQNYNS8fMLzlfCcACDe1Hf6a+rCE6kazzEexQLfrcvKe4TAxAoGAR/lM
5GQjhoKYh2I2uL72ZHfJOiQNjIlFCAv8YfWZ8qtDZ+zPMA5URZlMs2F3UWO7G/ct
NkM1+gLOiNfsNxQMM+SlZqC433nYZ4SRmvp9qn2SiADAuSL1MM6POQiiqy4Hcj17
tJd2RdSiEEXMVmnoi5eYCGUvliIcM3Q9ljGCrH8CgYAviuSqMIpQYRgXstQ3WbrG
mo08BUsOmcPGOAhNe6f1Tg9MboGpa5udfZk1ocGfYjaF3jrYjyx6+cUTrJ9sv/3C
MmJdat+JiTOD7brpyUHuhrvhLR7VGGsaQSco0twjyRRMMBZrWSVaPAyoyARcyLEl
MgTx5su/HM6sDfpmsBqcmw==
-----END PRIVATE KEY-----`;

const createTestToken = async (payload: any) => {
  const privateKey = await importPKCS8(testPrivateKey, 'RS256');
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuedAt()
    .setIssuer(config.ISSUER)
    .setAudience(config.AUDIENCE)
    .setExpirationTime('1h')
    .sign(privateKey);
};

describe('Authentication Middleware', () => {
  describe('Protected routes', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401)
        .expect('Content-Type', /json/);
      
      expect(response.body).toHaveProperty('error', 'Missing or invalid authorization header');
      expect(response.body).toHaveProperty('code', 'MISSING_TOKEN');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
        .expect('Content-Type', /json/);
      
      expect(response.body).toHaveProperty('error', 'Invalid token');
      expect(response.body).toHaveProperty('code', 'INVALID_TOKEN');
    });

    it('should accept requests with valid token', async () => {
      const token = await createTestToken({
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        tenant_id: 'tenant-456'
      });

      // This will fail because the backend service isn't running,
      // but it should pass authentication
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      
      // Should not be 401 (auth error)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Role-based access', () => {
    it('should deny access to admin routes for regular users', async () => {
      const token = await createTestToken({
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user']
      });

      const response = await request(app)
        .get('/auth/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect('Content-Type', /json/);
      
      expect(response.body).toHaveProperty('error', "Role 'admin' required");
      expect(response.body).toHaveProperty('code', 'INSUFFICIENT_PERMISSIONS');
    });

    it('should allow access to admin routes for admin users', async () => {
      const token = await createTestToken({
        sub: 'admin-123',
        email: 'admin@example.com',
        roles: ['admin']
      });

      // This will fail because the backend service isn't running,
      // but it should pass authorization
      const response = await request(app)
        .get('/auth/admin/users')
        .set('Authorization', `Bearer ${token}`);
      
      // Should not be 403 (authorization error)
      expect(response.status).not.toBe(403);
    });
  });

  describe('Public routes', () => {
    it('should allow access to public auth routes', async () => {
      // These will fail because backend services aren't running,
      // but they should not require authentication
      const loginResponse = await request(app)
        .post('/auth/login');
      
      const registerResponse = await request(app)
        .post('/auth/register');
      
      // Should not be 401 (auth required)
      expect(loginResponse.status).not.toBe(401);
      expect(registerResponse.status).not.toBe(401);
    });
  });
});