import { Request, Response } from 'express';

import { refreshRotatedCounter, refreshReuseBlockedCounter } from '../../../cmd/server/main';
import { rotateRefresh } from '../../security/jwt';

export async function refreshHandler(req: Request, res: Response) {
  const token = (req.body && req.body.refresh_token) || req.headers['x-refresh-token'];
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'refresh_token requerido' });
  }
  const pair = await rotateRefresh(token);
  if (!pair) {
    refreshReuseBlockedCounter.inc();
    return res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
  refreshRotatedCounter.inc();
  return res.status(200).json({
    access_token: pair.accessToken,
    refresh_token: pair.refreshToken,
    token_type: 'Bearer',
    expires_in: pair.expiresIn
  });
}
