import { Request, Response } from 'express';
import { withSpan } from '@smartedify/shared';
import { RegisterRequestSchema } from './register.dto';
import { registerUser } from '../../services/register.service';

const AUTH_TRACER = process.env.AUTH_SERVICE_NAME || 'auth-service';

export async function registerHandler(req: Request, res: Response) {
  const tenantId = typeof (req as any)?.body?.tenant_id === 'string' && (req as any).body.tenant_id.trim()
    ? (req as any).body.tenant_id
    : 'default';

  return withSpan(AUTH_TRACER, 'auth.register', { 'auth.tenant_id': tenantId }, async span => {
    const parseResult = RegisterRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      span.setAttribute('auth.result', 'validation_error');
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
    }

    const { email, password, name } = parseResult.data;

    try {
      const user = await registerUser(email, password, name, tenantId);
      span.setAttribute('auth.result', 'success');
      span.setAttribute('auth.user_id', user.id);
      return res.status(201).json({
        message: 'Usuario registrado',
        user
      });
    } catch (error: any) {
      span.setAttribute('auth.result', 'failure');
      let statusCode = 500;
      if (error.message === 'User Service no disponible') {
          statusCode = 502;
      } else if (error.message === 'Usuario no permitido por User Service') {
          statusCode = 403;
      } else if (error.message === 'El usuario ya existe') {
          statusCode = 409;
      }
      return res.status(statusCode).json({ error: error.message });
    }
  });
}
