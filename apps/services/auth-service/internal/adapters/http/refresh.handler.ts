import { Request, Response } from 'express';

import { refreshRotatedCounter, refreshReuseBlockedCounter } from '../../../cmd/server/main';
import { rotateRefresh } from '../../security/jwt';
import { withSpan } from '@smartedify/shared';

const AUTH_TRACER = process.env.AUTH_SERVICE_NAME || 'auth-service';

export async function refreshHandler(req: Request, res: Response) {
  const token = (req.body && req.body.refresh_token) || req.headers['x-refresh-token'];

  return withSpan(AUTH_TRACER, 'auth.refresh', undefined, async span => {
    if (!token || typeof token !== 'string') {
      span.setAttribute('auth.result', 'validation_error');
      span.addEvent('refresh.failure', { reason: 'missing_token' });
      return res.status(400).json({ error: 'refresh_token requerido' });
    }

    const pair = await rotateRefresh(token);
    if (!pair) {
      span.setAttribute('auth.result', 'invalid_token');
      span.addEvent('refresh.failure', { reason: 'rotate_failed' });
      refreshReuseBlockedCounter.inc();
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    if (pair.sub) {
      span.setAttribute('auth.user_id', pair.sub);
    }
    if (pair.tenant_id) {
      span.setAttribute('auth.tenant_id', pair.tenant_id);
    }
    span.setAttribute('auth.result', 'success');
    span.addEvent('refresh.success', {
      ...(pair.sub ? { 'auth.user_id': pair.sub } : {}),
      ...(pair.tenant_id ? { 'auth.tenant_id': pair.tenant_id } : {})
    });

    refreshRotatedCounter.inc();
    return res.status(200).json({
      access_token: pair.accessToken,
      refresh_token: pair.refreshToken,
      token_type: 'Bearer',
      expires_in: pair.expiresIn
    });
  });
}
