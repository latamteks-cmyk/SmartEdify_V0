import { Request, Response } from 'express';
import { withSpan } from '@smartedify/shared';
import { LoginRequestSchema } from './login.dto';
import { loginUser } from '../../services/login.service';

const AUTH_TRACER = process.env.AUTH_SERVICE_NAME || 'auth-service';

export async function loginHandler(req: Request, res: Response) {
  const tenantId = typeof req.body?.tenant_id === 'string' && req.body.tenant_id.trim()
    ? req.body.tenant_id
    : 'default';

  return withSpan(AUTH_TRACER, 'auth.login', { 'auth.tenant_id': tenantId }, async span => {
    const parseResult = LoginRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      span.setAttribute('auth.result', 'validation_error');
      span.addEvent('login.failure', { reason: 'validation_error' });
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
    }

    const { email, password } = parseResult.data;

    try {
      const { accessToken, refreshToken, expiresIn, roles } = await loginUser(email, password, tenantId);
      span.setAttribute('auth.result', 'success');
      span.addEvent('login.success');
      return res.status(200).json({
        message: 'Login exitoso',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        roles
      });
    } catch (error: any) {
      span.setAttribute('auth.result', 'invalid_credentials');
      span.addEvent('login.failure', { reason: 'invalid_credentials' });
      return res.status(401).json({ error: error.message });
    }
  });
}
