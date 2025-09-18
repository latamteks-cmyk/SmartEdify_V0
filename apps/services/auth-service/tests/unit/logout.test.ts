jest.mock('../../internal/security/jwt', () => ({
  verifyRefresh: jest.fn(),
  verifyAccess: jest.fn()
}));

jest.mock('../../internal/adapters/redis/redis.adapter', () => ({
  revokeRefreshToken: jest.fn(),
  markRefreshRotated: jest.fn(),
  addToRevocationList: jest.fn(),
  deleteSession: jest.fn()
}));

jest.mock('../../cmd/server/main', () => ({
  tokenRevokedCounter: { inc: jest.fn() }
}));

// Eliminado mock inline de pg.adapter para usar el mock global

import { tokenRevokedCounter } from '../../cmd/server/main';
import { logoutHandler } from '../../internal/adapters/http/logout.handler';
import {
  revokeRefreshToken,
  markRefreshRotated,
  addToRevocationList,
  deleteSession
} from '../../internal/adapters/redis/redis.adapter';
import { verifyRefresh, verifyAccess } from '../../internal/security/jwt';

import type { Request, Response } from 'express';
function mockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('logoutHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe revocar refresh token válido', async () => {
    (verifyRefresh as jest.Mock).mockResolvedValue({
      jti: 'refresh-jti',
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: 'user-1',
      tenant_id: 'tenant-1'
    });
  const req = { body: { token: 'refresh-token' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as Partial<Request>;
  const res = mockResponse();
  await logoutHandler(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(revokeRefreshToken).toHaveBeenCalledWith('refresh-jti');
    expect(markRefreshRotated).toHaveBeenCalledWith('refresh-jti', expect.any(Number));
    expect(addToRevocationList).toHaveBeenCalledWith('refresh-jti', 'refresh', 'logout', expect.any(Number));
    expect(deleteSession).toHaveBeenCalledWith('refresh-jti');
    expect(tokenRevokedCounter.inc).toHaveBeenCalledWith({ type: 'refresh' });
  });

  it('debe rechazar payload inválido', async () => {
  const req = { body: { token: 'bad' } } as Partial<Request>;
  const res = mockResponse();
  await logoutHandler(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Datos inválidos' }));
  });

  it('debe responder 401 cuando el token no es válido', async () => {
    (verifyRefresh as jest.Mock).mockRejectedValue(new Error('invalid'));
    (verifyAccess as jest.Mock).mockRejectedValue(new Error('invalid'));
  const req = { body: { token: 'invalid-token-12345' } } as Partial<Request>;
  const res = mockResponse();
  await logoutHandler(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Token inválido o expirado' }));
    expect(revokeRefreshToken).not.toHaveBeenCalled();
  });
});
