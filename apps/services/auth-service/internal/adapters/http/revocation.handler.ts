import { Request, Response } from 'express';
import { RevocationRequestSchema } from './revocation.dto';
import { resolveClientAuthentication } from '../../oauth/clients';
import { verifyAccess, verifyRefresh } from '../../security/jwt';
import {
  addToRevocationList,
  deleteSession,
  markRefreshRotated,
  revokeRefreshToken
} from '../redis/redis.adapter';
import { tokenRevokedCounter } from '../../../cmd/server/main';

function ttlFromExp(exp?: number): number {
  if (!exp || typeof exp !== 'number') return 0;
  const seconds = Math.floor(exp - Date.now() / 1000);
  return seconds > 0 ? seconds : 0;
}

export async function revocationHandler(req: Request, res: Response) {
  const parseResult = RevocationRequestSchema.safeParse(req.body || {});
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
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  try {
    const decoded: any = await verifyRefresh(token);
    if (decoded?.jti) {
      const ttl = Math.max(ttlFromExp(decoded.exp), 1);
      try {
        await revokeRefreshToken(decoded.jti);
      } catch (e) {
        if (process.env.AUTH_TEST_LOGS) console.error('[revocation] revokeRefreshToken failed', e);
      }
      try {
        await markRefreshRotated(decoded.jti, ttl);
      } catch {}
      try {
        await addToRevocationList(decoded.jti, 'refresh', 'revocation', ttl);
      } catch (e) {
        if (process.env.AUTH_TEST_LOGS) console.error('[revocation] addToRevocationList refresh failed', e);
      }
      try {
        await deleteSession(decoded.jti);
      } catch {}
      try {
        tokenRevokedCounter.inc({ type: 'refresh' });
      } catch {}
    }
    return res.status(200).json({});
  } catch (refreshErr) {
    // ignore and try as access token
  }

  try {
    const decoded: any = await verifyAccess(token);
    if (decoded?.jti) {
      const ttl = Math.max(ttlFromExp(decoded.exp), 1);
      try {
        await addToRevocationList(decoded.jti, 'access', 'revocation', ttl);
      } catch (e) {
        if (process.env.AUTH_TEST_LOGS) console.error('[revocation] addToRevocationList access failed', e);
      }
      try {
        tokenRevokedCounter.inc({ type: 'access' });
      } catch {}
    }
  } catch (accessErr) {
    // Silently ignore invalid tokens per RFC 7009
  }

  return res.status(200).json({});
}
