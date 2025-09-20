import request from 'supertest';
import app from '../../app';
import { createAdminToken, createUserToken } from '../helpers/auth.helper';
import '../setup';

describe('User Service Contract Tests', () => {
  let adminToken: string;
  let userToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user
    const createRes = await request(app)
      .post('/users')
      .send({ 
        id: 'contract-user-123',
        email: 'contract@test.com', 
        name: 'Contract User', 
        password: 'password123' 
      });
    
    testUserId = createRes.body.user.id;
    adminToken = createAdminToken('admin-123', 'admin@test.com');
    userToken = createUserToken(testUserId, 'contract@test.com');
  });

  describe('POST /users', () => {
    it('should create user with valid contract', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'newuser@contract.com',
          name: 'New Contract User',
          password: 'securepass123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Usuario creado',
        user: {
          id: expect.any(String),
          email: 'newuser@contract.com',
          name: 'New Contract User'
        }
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject duplicate email with proper error contract', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'contract@test.com', // Already exists
          name: 'Duplicate User',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        error: 'User with this email already exists'
      });
    });
  });

  describe('GET /users/:id', () => {
    it('should return user data with proper contract (owner access)', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        user: {
          id: testUserId,
          email: 'contract@test.com',
          name: 'Contract User'
        }
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return user data with proper contract (admin access)', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        user: {
          id: testUserId,
          email: 'contract@test.com',
          name: 'Contract User'
        }
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 404 with proper error contract for non-existent user', async () => {
      const response = await request(app)
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Usuario no encontrado'
      });
    });

    it('should return 401 with proper error contract when no auth', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}`);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Missing or invalid authorization header'
      });
    });

    it('should return 403 with proper error contract when accessing other user', async () => {
      const otherUserToken = createUserToken('other-user', 'other@test.com');
      
      const response = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        error: 'Access denied'
      });
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user with proper contract', async () => {
      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Contract User',
          email: 'updated@contract.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Usuario actualizado',
        user: {
          id: testUserId,
          email: 'updated@contract.com',
          name: 'Updated Contract User'
        }
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 404 with proper error contract for non-existent user', async () => {
      const response = await request(app)
        .put('/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          email: 'updated@test.com'
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Usuario no encontrado'
      });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user with proper contract (admin only)', async () => {
      const response = await request(app)
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Usuario eliminado',
        id: testUserId
      });
    });

    it('should return 403 with proper error contract when non-admin tries to delete', async () => {
      const response = await request(app)
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        error: "Role 'admin' required"
      });
    });
  });

  describe('GET /users', () => {
    it('should list users with proper contract (admin only)', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            email: expect.any(String),
            name: expect.any(String)
          })
        ])
      });
      
      // Ensure no passwords are returned
      response.body.items.forEach((user: any) => {
        expect(user.password).toBeUndefined();
      });
    });

    it('should return 403 with proper error contract when non-admin tries to list', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        error: "Role 'admin' required"
      });
    });
  });

  describe('GET /profile', () => {
    it('should return user profile with proper contract', async () => {
      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        profile: {
          id: testUserId,
          email: 'contract@test.com',
          name: 'Contract User'
        }
      });
      expect(response.body.profile.password).toBeUndefined();
    });

    it('should return 401 with proper error contract when no auth', async () => {
      const response = await request(app)
        .get('/profile');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Missing or invalid authorization header'
      });
    });
  });

  describe('PUT /profile', () => {
    it('should update profile with proper contract', async () => {
      const response = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Profile Name',
          email: 'updated.profile@test.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Profile updated successfully',
        profile: {
          id: testUserId,
          email: 'updated.profile@test.com',
          name: 'Updated Profile Name'
        }
      });
      expect(response.body.profile.password).toBeUndefined();
    });

    it('should return validation error with proper contract for invalid data', async () => {
      const response = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.any(Array)
      });
    });
  });

  describe('GET /preferences', () => {
    it('should return user preferences with proper contract', async () => {
      const response = await request(app)
        .get('/preferences')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        preferences: {
          userId: testUserId,
          language: 'es',
          notifications: {
            email: true,
            sms: false,
            push: true
          },
          theme: 'light',
          timezone: 'America/Bogota'
        }
      });
    });
  });

  describe('PUT /preferences', () => {
    it('should update preferences with proper contract', async () => {
      const response = await request(app)
        .put('/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'dark',
          language: 'en',
          notifications: {
            email: false,
            push: false
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Preferences updated successfully',
        preferences: {
          userId: testUserId,
          language: 'en',
          theme: 'dark',
          notifications: {
            email: false,
            sms: false, // Should preserve existing value
            push: false
          }
        }
      });
    });

    it('should return validation error with proper contract for invalid preferences', async () => {
      const response = await request(app)
        .put('/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'invalid-theme'
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.any(Array)
      });
    });
  });
});