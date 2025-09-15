import express from 'express';
import { createUserHandler } from './internal/adapters/http/create-user.handler';
import { getUserHandler } from './internal/adapters/http/get-user.handler';
import { updateUserHandler } from './internal/adapters/http/update-user.handler';
import { deleteUserHandler } from './internal/adapters/http/delete-user.handler';
import { listUsersHandler } from './internal/adapters/http/list-users.handler';

const app = express();
app.use(express.json());
app.post('/users', createUserHandler);
app.get('/users', listUsersHandler);
app.get('/users/:id', getUserHandler);
app.put('/users/:id', updateUserHandler);
app.delete('/users/:id', deleteUserHandler);

export default app;
