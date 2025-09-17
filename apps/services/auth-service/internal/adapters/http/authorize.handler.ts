import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { AuthorizeRequestSchema } from './authorize.dto';
import {
  clientSupportsResponseType,
  findClientById,
  getDefaultScopes,
  hasAllScopes,
  isRedirectUriAllowed,
  normalizeScopes
} from '../../oauth/clients';
import { verifyAccess } from '../../security/jwt';
import { saveAuthorizationCode } from '../redis/redis.adapter';

const CODE_TTL_SECONDS = 600;

function firstParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function generateAuthorizationCode(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function authorizeHandler(req: Request, res: Response) {
  const input = {
    response_type: firstParam(req.query.response_type) || undefined,
    client_id: firstParam(req.query.client_id) || undefined,
    redirect_uri: firstParam(req.query.redirect_uri) || undefined,
    scope: firstParam(req.query.scope) || undefined,
    state: firstParam(req.query.state) || undefined,
    code_challenge: firstParam(req.query.code_challenge) || undefined,
    code_challenge_method: firstParam(req.query.code_challenge_method) || undefined,
    nonce: firstParam(req.query.nonce) || undefined,
    prompt: firstParam(req.query.prompt) || undefined,
    login_hint: firstParam(req.query.login_hint) || undefined
  };
  const parseResult = AuthorizeRequestSchema.safeParse(input);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'invalid_request',
      details: parseResult.error.flatten()
    });
  }
  const data = parseResult.data;
  const client = findClientById(data.client_id);
  if (!client) {
    return res.status(400).json({ error: 'invalid_client' });
  }
  if (!clientSupportsResponseType(client, data.response_type)) {
    return res.status(400).json({ error: 'unsupported_response_type' });
  }
  if (!isRedirectUriAllowed(client, data.redirect_uri)) {
    return res.status(400).json({ error: 'invalid_redirect_uri' });
  }

  const scopes = normalizeScopes(data.scope);
  const effectiveScopes = scopes.length ? scopes : getDefaultScopes(client);
  if (!hasAllScopes(client, effectiveScopes)) {
    return res.status(400).json({ error: 'invalid_scope' });
  }
  if (!effectiveScopes.includes('openid')) {
    return res.status(400).json({ error: 'invalid_scope', error_description: 'openid requerido' });
  }

  if (client.requirePkce && !data.code_challenge) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'code_challenge requerido' });
  }
  const rawPkceMethod = data.code_challenge ? (data.code_challenge_method || 'plain').toUpperCase() : undefined;
  if (rawPkceMethod && !['PLAIN', 'S256'].includes(rawPkceMethod)) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'code_challenge_method inválido' });
  }
  if (client.requirePkce && rawPkceMethod !== 'S256') {
    return res.status(400).json({ error: 'invalid_request', error_description: 'code_challenge_method debe ser S256' });
  }
  const pkceMethod = data.code_challenge
    ? rawPkceMethod === 'S256'
      ? 'S256'
      : 'plain'
    : undefined;

  const authorization = req.headers.authorization || req.headers.Authorization;
  if (!authorization || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'login_required' });
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'login_required' });
  }

  let payload: any;
  try {
    payload = await verifyAccess(token);
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  if (!payload?.sub || typeof payload.sub !== 'string') {
    return res.status(400).json({ error: 'invalid_token', error_description: 'sub ausente' });
  }

  const roles = Array.isArray(payload.roles)
    ? payload.roles
    : typeof payload.roles === 'string'
    ? [payload.roles]
    : [];
  const tenantId = typeof payload.tenant_id === 'string' ? payload.tenant_id : 'default';
  const authTime = typeof payload.auth_time === 'number'
    ? payload.auth_time
    : typeof payload.iat === 'number'
    ? payload.iat
    : Math.floor(Date.now() / 1000);

  const code = generateAuthorizationCode();
  const scopeString = effectiveScopes.join(' ');
  await saveAuthorizationCode(
    code,
    {
      clientId: client.clientId,
      redirectUri: data.redirect_uri,
      scope: scopeString,
      codeChallenge: data.code_challenge || null,
      codeChallengeMethod: pkceMethod || null,
      userId: payload.sub,
      tenantId,
      roles,
      nonce: data.nonce || null,
      authTime,
      issuedAt: Date.now()
    },
    CODE_TTL_SECONDS
  );

  const redirectUri = new URL(data.redirect_uri);
  redirectUri.searchParams.set('code', code);
  if (data.state) {
    redirectUri.searchParams.set('state', data.state);
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  return res.redirect(302, redirectUri.toString());
}
