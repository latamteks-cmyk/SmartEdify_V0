import { Request, Response } from 'express';

import { loginSuccessCounter, loginFailCounter } from '../../../cmd/server/main';
import { verifyPassword } from '../../security/crypto';
import { issueTokenPair, verifyRefresh } from '../../security/jwt';
import * as pgAdapter from '@db/pg.adapter';
import { saveSession } from '../redis/redis.adapter';

import { LoginRequestSchema } from './login.dto';

const DEFAULT_ROLE = process.env.AUTH_DEFAULT_ROLE || 'user';

export async function loginHandler(req: Request, res: Response) {
  const parseResult = LoginRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
  }
  const { email, password } = parseResult.data;
  const tenant_id = req.body.tenant_id || 'default';
  const user = await pgAdapter.getUserByEmail(email, tenant_id);
  if (process.env.AUTH_TEST_LOGS) console.log('[login] fetched user', user);
  let valid = false;
  if (user) {
    valid = await verifyPassword(user.pwd_hash, password);
    if (process.env.AUTH_TEST_LOGS) console.log('[login] verifyPassword', user.pwd_hash, password, '=>', valid);
  }
  if (!user || !valid) {
    loginFailCounter.inc();
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  // Generar tokens (access + refresh)
  let roles: string[] = [];
  try {
  roles = await pgAdapter.getUserRoles(user.id, tenant_id);
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) console.error('[login] getUserRoles failed', e);
  }
  if (!roles || roles.length === 0) roles = [DEFAULT_ROLE];
  const pair = await issueTokenPair({ sub: user.id, tenant_id, roles });
  // Sesión corta (opcional) para tracking
  let sessionId: string | null = null;
  try {
    const refreshPayload: any = await verifyRefresh(pair.refreshToken);
    sessionId = typeof refreshPayload?.jti === 'string' ? refreshPayload.jti : null;
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) console.warn('[login] verifyRefresh for session failed', (e as any)?.message);
  }
  const sessionKey = sessionId || pair.accessToken.substring(0, 24);
  await saveSession(sessionKey, {
    userId: user.id,
    tenant_id,
    access_kid: pair.accessKid,
    refresh_kid: pair.refreshKid,
    access_jti: pair.accessJti,
    refresh_jti: pair.refreshJti
  }, pair.expiresIn);
  loginSuccessCounter.inc();
  return res.status(200).json({
    message: 'Login exitoso',
    access_token: pair.accessToken,
    refresh_token: pair.refreshToken,
    token_type: 'Bearer',
    expires_in: pair.expiresIn,
    roles
  });
}
