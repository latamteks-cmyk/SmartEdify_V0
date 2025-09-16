import express from 'express';

import { registerHandler } from './internal/adapters/http/register.handler';
// ...import otros handlers

const app = express();
app.use(express.json());

// Endpoints principales
app.post('/register', registerHandler);
import { loginHandler } from '../../internal/adapters/http/login.handler';
app.post('/login', loginHandler);
import { logoutHandler } from '../../internal/adapters/http/logout.handler';
app.post('/logout', logoutHandler);
import { forgotPasswordHandler } from '../../internal/adapters/http/forgot-password.handler';
app.post('/forgot-password', forgotPasswordHandler);
import { resetPasswordHandler } from '../../internal/adapters/http/reset-password.handler';
app.post('/reset-password', resetPasswordHandler);
import { rolesHandler, permissionsHandler } from '../../internal/adapters/http/roles-permissions.handler';
app.get('/roles', rolesHandler);
app.get('/permissions', permissionsHandler);

const PORT = process.env.AUTH_PORT || 8080;
app.listen(PORT, () => {
  console.log(`Auth Service escuchando en puerto ${PORT}`);
});
