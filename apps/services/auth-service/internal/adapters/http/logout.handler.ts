import { Request, Response } from 'express';

import { tokenRevokedCounter } from '../../../cmd/server/main';
import { verifyRefresh, verifyAccess } from '../../security/jwt';
import * as pgAdapter from '../../adapters/db/pg.adapter';
import {
  revokeRefreshToken,
  markRefreshRotated,
  addToRevocationList,
  deleteSession,
  addAccessTokenToDenyList
} from '../redis/redis.adapter';

import { LogoutRequestSchema } from './logout.dto';

function ttlFromExp(exp?: number): number {
  if (!exp || typeof exp !== 'number') return 0;
  const seconds = Math.floor(exp - Date.now() / 1000);
  return seconds > 0 ? seconds : 0;
}

export async function logoutHandler(req: Request, res: Response) {
  const parseResult = LogoutRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
  }
  const { token } = parseResult.data;
  let decoded: any;
  let tokenType: 'refresh' | 'access';
  try {
    decoded = await verifyRefresh(token);
    tokenType = decoded?.type === 'refresh' ? 'refresh' : 'access';
  } catch (refreshErr) {
    try {
      decoded = await verifyAccess(token);
      tokenType = decoded?.type === 'access' ? 'access' : 'refresh';
    } catch (accessErr) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  }

  if (!decoded || !decoded.jti || (tokenType !== 'refresh' && tokenType !== 'access')) {
    return res.status(400).json({ error: 'Token inválido' });
  }

  const ttl = Math.max(ttlFromExp(decoded.exp), 1);

  try {
    if (tokenType === 'refresh') {
      await revokeRefreshToken(decoded.jti);
      await markRefreshRotated(decoded.jti, ttl);
      await addToRevocationList(decoded.jti, 'refresh', 'logout', ttl);
      try { await deleteSession(decoded.jti); } catch {}
    } else {
      await addToRevocationList(decoded.jti, 'access', 'logout', ttl);
      await addAccessTokenToDenyList(decoded.jti, 'logout', ttl);
    }
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) console.error('[logout] revocation failed', e);
    return res.status(500).json({ error: 'logout_failed' });
  }

  try {
    tokenRevokedCounter.inc({ type: tokenType });
  } catch {}

  try {
  await pgAdapter.logSecurityEvent({
      actor: decoded.sub || 'unknown',
      event: 'auth.logout',
      ip: req.ip || '',
      ua: (req.headers['user-agent'] as string) || '',
      tenant_id: decoded.tenant_id || 'default',
      details_json: { token_type: tokenType, jti: decoded.jti }
    });
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) console.error('[logout] audit log failed', e);
  }

  return res.status(204).send();
}
