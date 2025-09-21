import { Request, Response } from 'express';
import { IntrospectionRequestSchema } from './introspection.dto';
import { resolveClientAuthentication } from '../../oauth/clients';
import { verifyAccess, verifyRefresh } from '../../security/jwt';
import { getIssuer } from '../../config/issuer';
import { isRevoked } from '../../adapters/redis/redis.adapter';

export async function introspectionHandler(req: Request, res: Response) {
  const parseResult = IntrospectionRequestSchema.safeParse(req.body || {});
  if (!parseResult.success) {
    return res.status(400).json({ error: 'invalid_request', details: parseResult.error.flatten() });
  }
  const data = parseResult.data;
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const clientAuth = resolveClientAuthentication({
    authorizationHeader: authHeader,
    bodyClientId: data.client_id,
    bodyClientSecret: data.client_secret
  });
  if (!clientAuth) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  const token = data.token;
  let decoded: any;
  let tokenType: 'access_token' | 'refresh_token';
  try {
    decoded = await verifyAccess(token);
    tokenType = 'access_token';
  } catch (accessErr) {
    try {
      decoded = await verifyRefresh(token);
      tokenType = 'refresh_token';
    } catch (refreshErr) {
      return res.json({ active: false });
    }
  }

  // Check if token is revoked
  if (decoded.jti && await isRevoked(decoded.jti)) {
    return res.json({ active: false });
  }

  const response: Record<string, any> = {
    active: true,
    token_type: tokenType,
    client_id: decoded.client_id || clientAuth.client.clientId,
    scope: typeof decoded.scope === 'string' ? decoded.scope : undefined,
    sub: decoded.sub,
    iss: getIssuer(),
    exp: decoded.exp,
    iat: decoded.iat,
    aud: decoded.aud,
    tenant_id: decoded.tenant_id,
    roles: decoded.roles
  };

  Object.keys(response).forEach(key => {
    if (response[key] === undefined || response[key] === null) {
      delete response[key];
    }
  });

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  return res.json(response);
}
