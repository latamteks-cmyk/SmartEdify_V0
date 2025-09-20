import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export function createTestToken(payload: {
  sub: string;
  email: string;
  roles?: string[];
  tenant_id?: string;
}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function createAdminToken(userId: string, email: string) {
  return createTestToken({
    sub: userId,
    email,
    roles: ['admin'],
    tenant_id: 'test-tenant'
  });
}

export function createUserToken(userId: string, email: string) {
  return createTestToken({
    sub: userId,
    email,
    roles: ['user'],
    tenant_id: 'test-tenant'
  });
}