import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { TokenRequestSchema } from './token.dto';
import {
  clientSupportsGrant,
  hasAllScopes,
  normalizeScopes,
  resolveClientAuthentication
} from '../../oauth/clients';
import { consumeAuthorizationCode } from '../redis/redis.adapter';
import { issueTokenPair, rotateRefresh, signIdToken } from '../../security/jwt';
import { getUserById } from '../db/pg.adapter';

function base64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  const normalized = method.toUpperCase();
  if (normalized === 'S256') {
    const hashed = createHash('sha256').update(verifier).digest();
    return base64Url(hashed) === challenge;
  }
  return verifier === challenge;
}

export async function tokenHandler(req: Request, res: Response) {
  const parseResult = TokenRequestSchema.safeParse(req.body || {});
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
  const client = clientAuth.client;
  if (!clientSupportsGrant(client, data.grant_type)) {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  if (data.grant_type === 'authorization_code') {
    if (!data.code) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'code requerido' });
    }
    if (!data.redirect_uri) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri requerido' });
    }
    const stored = await consumeAuthorizationCode(data.code);
    if (!stored || stored.clientId !== client.clientId) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    if (stored.redirectUri !== data.redirect_uri) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri no coincide' });
    }
    if (stored.codeChallenge) {
      if (!data.code_verifier) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'code_verifier requerido' });
      }
      const method = typeof stored.codeChallengeMethod === 'string' ? stored.codeChallengeMethod : 'plain';
      if (!verifyPkce(data.code_verifier, stored.codeChallenge, method)) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE inválido' });
      }
    }

    const scopeString = typeof stored.scope === 'string' ? stored.scope : '';
    const scopes = normalizeScopes(scopeString);
    if (!hasAllScopes(client, scopes)) {
      return res.status(400).json({ error: 'invalid_scope' });
    }
    const roles = Array.isArray(stored.roles)
      ? stored.roles
      : typeof stored.roles === 'string'
      ? [stored.roles]
      : [];
    const tenantId = typeof stored.tenantId === 'string' ? stored.tenantId : 'default';

    const pair = await issueTokenPair({
      sub: stored.userId,
      tenant_id: tenantId,
      roles,
      scope: scopeString,
      client_id: client.clientId,
      auth_time: typeof stored.authTime === 'number' ? stored.authTime : undefined
    });

    let idToken: string | null = null;
    try {
      const user = stored.userId ? await getUserById(stored.userId) : null;
      const extra: Record<string, any> = {};
      if (user) {
        extra.email = user.email;
        extra.name = user.name;
      }
      if (stored.nonce) extra.nonce = stored.nonce;
      const id = await signIdToken({
        sub: stored.userId,
        tenant_id: tenantId,
        client_id: client.clientId,
        scope: scopeString,
        roles,
        auth_time: typeof stored.authTime === 'number' ? stored.authTime : undefined,
        extra
      });
      idToken = id.token;
    } catch (e) {
      if (process.env.AUTH_TEST_LOGS) console.error('[token] error generando id_token', e);
    }

    const response: any = {
      access_token: pair.accessToken,
      refresh_token: pair.refreshToken,
      token_type: 'Bearer',
      expires_in: pair.expiresIn,
      scope: scopeString
    };
    if (idToken) response.id_token = idToken;
    return res.json(response);
  }

  if (data.grant_type === 'refresh_token') {
    if (!data.refresh_token) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token requerido' });
    }
    const pair = await rotateRefresh(data.refresh_token);
    if (!pair) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    const currentScope = typeof pair.scope === 'string' ? pair.scope : '';
    const grantedScopes = normalizeScopes(currentScope);
    let scopeString = currentScope;
    if (data.scope) {
      const requestedScopes = normalizeScopes(data.scope);
      if (!requestedScopes.every(scope => grantedScopes.includes(scope))) {
        return res.status(400).json({ error: 'invalid_scope' });
      }
      scopeString = requestedScopes.join(' ');
    }
    const roles = Array.isArray(pair.roles)
      ? pair.roles
      : typeof pair.roles === 'string'
      ? [pair.roles]
      : [];
    const tenantId = typeof pair.tenant_id === 'string' ? pair.tenant_id : 'default';

    let idToken: string | null = null;
    if (scopeString.includes('openid')) {
      try {
        const user = pair.sub ? await getUserById(pair.sub) : null;
        const extra: Record<string, any> = {};
        if (user) {
          extra.email = user.email;
          extra.name = user.name;
        }
        const id = await signIdToken({
          sub: pair.sub || '',
          tenant_id: tenantId,
          client_id: pair.client_id || client.clientId,
          scope: scopeString,
          roles,
          extra
        });
        idToken = id.token;
      } catch (e) {
        if (process.env.AUTH_TEST_LOGS) console.error('[token] error generando id_token refresh', e);
      }
    }

    const response: any = {
      access_token: pair.accessToken,
      refresh_token: pair.refreshToken,
      token_type: 'Bearer',
      expires_in: pair.expiresIn,
      scope: scopeString
    };
    if (idToken) response.id_token = idToken;
    return res.json(response);
  }

  return res.status(400).json({ error: 'unsupported_grant_type' });
}
