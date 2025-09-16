import { Request, Response } from 'express';
import { verifyAccess } from '../../security/jwt';
import { getUserById } from '../db/pg.adapter';
import { normalizeScopes } from '../../oauth/clients';

export async function userinfoHandler(req: Request, res: Response) {
  const authorization = req.headers.authorization || req.headers.Authorization;
  if (!authorization || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  let payload: any;
  try {
    payload = await verifyAccess(token);
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  if (!payload?.sub || typeof payload.sub !== 'string') {
    return res.status(400).json({ error: 'invalid_token' });
  }

  const user = await getUserById(payload.sub);
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' });
  }

  const scopeString = typeof payload.scope === 'string' ? payload.scope : '';
  const scopes = normalizeScopes(scopeString);
  const response: any = {
    sub: payload.sub,
    tenant_id: typeof payload.tenant_id === 'string' ? payload.tenant_id : 'default',
    roles: Array.isArray(payload.roles)
      ? payload.roles
      : typeof payload.roles === 'string'
      ? [payload.roles]
      : [],
    scope: scopeString || undefined
  };

  if (scopes.includes('profile')) {
    response.name = user.name;
  }
  if (scopes.includes('email')) {
    response.email = user.email;
    response.email_verified = true;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  return res.json(response);
}
