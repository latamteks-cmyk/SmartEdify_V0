import request from 'supertest';
import app from '../../app';
import { createTestToken, createAdminToken, createUserToken } from '../helpers/auth.helper';
import '../setup';

describe('Authentication Tests', () => {
  let testUserId: string;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // Create a test user
    const createRes = await request(app)
      .post('/users')
      .send({ 
        id: 'test-user-123',
        email: 'test@auth.com', 
        name: 'Test User', 
        password: 'password123' 
      });
    
    testUserId = createRes.body.user.id;

    // Create tokens
    adminToken = createAdminToken(testUserId, 'test@auth.com');
    userToken = createUserToken(testUserId, 'test@auth.com');
  });

  describe('Protected endpoints', () => {
    it('should reject requests without token', async () => {
      const res = await request(app).get('/users');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing or invalid authorization header');
    });

    it('should reject requests with invalid token', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    it('should allow admin to list users', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
    });

    it('should deny non-admin from listing users', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Role 'admin' required");
    });

    it('should allow user to access their own profile', async () => {
      const res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(testUserId);
    });

    it('should deny user from accessing other user profiles', async () => {
      const otherUserToken = createTestToken({
        sub: 'other-user-456',
        email: 'other@auth.com',
        roles: ['user']
      });

      const res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });
  });

  describe('Profile endpoints', () => {
    it('should get user profile', async () => {
      const res = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.profile.email).toBe('test@auth.com');
      expect(res.body.profile.password).toBeUndefined();
    });

    it('should update user profile', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' });
      
      expect(res.status).toBe(200);
      expect(res.body.profile.name).toBe('Updated Name');
    });

    it('should validate profile update data', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'invalid-email' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('Preferences endpoints', () => {
    it('should get user preferences with defaults', async () => {
      const res = await request(app)
        .get('/preferences')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.preferences.language).toBe('es');
      expect(res.body.preferences.theme).toBe('light');
    });

    it('should update user preferences', async () => {
      const res = await request(app)
        .put('/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ 
          theme: 'dark',
          notifications: { email: false }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.preferences.theme).toBe('dark');
      expect(res.body.preferences.notifications.email).toBe(false);
    });
  });
});