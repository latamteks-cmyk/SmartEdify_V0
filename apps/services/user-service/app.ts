import express from 'express';
import { createUserHandler } from './internal/adapters/http/create-user.handler';
import { getUserHandler } from './internal/adapters/http/get-user.handler';
import { updateUserHandler } from './internal/adapters/http/update-user.handler';
import { deleteUserHandler } from './internal/adapters/http/delete-user.handler';
import { listUsersHandler } from './internal/adapters/http/list-users.handler';
import { getProfileHandler, updateProfileHandler } from './internal/adapters/http/profile.handler';
import { getPreferencesHandler, updatePreferencesHandler } from './internal/adapters/http/preferences.handler';
import { authenticateJWT, requireOwnershipOrAdmin, requireRole } from './internal/middleware/auth.middleware';

const app = express();
app.use(express.json());

// Public endpoints (no authentication required)
app.post('/users', createUserHandler);

// Protected endpoints - require authentication
app.get('/users', authenticateJWT, requireRole('admin'), listUsersHandler);
app.get('/users/:id', authenticateJWT, requireOwnershipOrAdmin, getUserHandler);
app.put('/users/:id', authenticateJWT, requireOwnershipOrAdmin, updateUserHandler);
app.delete('/users/:id', authenticateJWT, requireRole('admin'), deleteUserHandler);

// Profile endpoints - require authentication
app.get('/profile', authenticateJWT, getProfileHandler);
app.put('/profile', authenticateJWT, updateProfileHandler);

// Preferences endpoints - require authentication
app.get('/preferences', authenticateJWT, getPreferencesHandler);
app.put('/preferences', authenticateJWT, updatePreferencesHandler);

export default app;
