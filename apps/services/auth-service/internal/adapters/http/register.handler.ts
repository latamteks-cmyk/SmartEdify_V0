import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getUserServiceClient } from '../user-service.client';
import { hashPassword } from '../../security/crypto';
import * as pgAdapter from '@db/pg.adapter';
import { RegisterRequestSchema } from './register.dto';
import { withSpan } from '@smartedify/shared';

const DEFAULT_ROLE = process.env.AUTH_DEFAULT_ROLE || 'user';
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
    // Generamos un id por consistencia (aunque createUser puede generar)
    const _id = uuidv4();

    const userServiceClient = getUserServiceClient();
    let validation: any;
    try {
      validation = await userServiceClient.validateUser({ email, tenantId, name });
    } catch (err) {
      if (process.env.AUTH_TEST_LOGS) {
        console.error('[register] User Service validation failed', err);
      }
      span.setAttribute('auth.result', 'user_service_unavailable');
      return res.status(502).json({ error: 'User Service no disponible', details: err instanceof Error ? err.message : String(err) });
    }

    if (!validation?.allowed) {
      span.setAttribute('auth.result', 'forbidden');
      return res.status(403).json({ error: 'Usuario no permitido por User Service', status: validation?.status });
    }

    const accountStatus = validation.status || 'active';
    const existing = await pgAdapter.getUserByEmail(email, tenantId);
    if (existing) {
      span.setAttribute('auth.result', 'conflict');
      span.setAttribute('auth.user_id', existing.id);
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const hashed = await hashPassword(password);
    const user = await pgAdapter.createUser({
      tenant_id: tenantId,
      email,
      pwd_hash: hashed,
      pwd_salt: '',
      name,
      status: accountStatus,
      created_at: new Date()
    });

    span.setAttribute('auth.user_id', user.id);

    const rolesToAssign: string[] = Array.isArray(validation.roles) && validation.roles.length > 0
      ? validation.roles
      : [DEFAULT_ROLE];
    const uniqueRoles = Array.from(new Set(rolesToAssign));
    for (const role of uniqueRoles) {
      try {
        await pgAdapter.assignUserRole(user.id, tenantId, role);
      } catch (e) {
        if (process.env.AUTH_TEST_LOGS) console.error('[register] assignUserRole failed', e);
      }
    }

    let roles: string[] = [];
    try {
      roles = await pgAdapter.getUserRoles(user.id, tenantId);
    } catch (e) {
      if (process.env.AUTH_TEST_LOGS) console.error('[register] getUserRoles failed', e);
    }
    if (!roles || roles.length === 0) roles = uniqueRoles.length ? uniqueRoles : [DEFAULT_ROLE];
    const permissions: string[] = Array.isArray(validation.permissions) ? validation.permissions : [];

    span.setAttribute('auth.result', 'success');

    return res.status(201).json({
      message: 'Usuario registrado',
      user: {
        id: user.id,
        email,
        name,
        status: accountStatus,
        roles,
        permissions
      }
    });
  });
}
