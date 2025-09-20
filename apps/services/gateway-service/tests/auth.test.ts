import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { config } from '../src/config/env';

const createTestToken = (payload: any) => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1h' });
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
      const token = createTestToken({
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user']
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
      const token = createTestToken({
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
      const token = createTestToken({
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