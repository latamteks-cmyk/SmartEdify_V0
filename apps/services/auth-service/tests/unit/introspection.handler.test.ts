import { introspectionHandler } from '../../internal/adapters/http/introspection.handler';
import { Request, Response } from 'express';
import * as clients from '../../internal/oauth/clients';
import * as jwt from '../../internal/security/jwt';
import * as redis from '../../internal/adapters/redis/redis.adapter';
import * as issuer from '../../internal/config/issuer';

jest.mock('../../internal/oauth/clients');
jest.mock('../../internal/security/jwt');
jest.mock('../../internal/adapters/redis/redis.adapter');
jest.mock('../../internal/config/issuer');

describe('Introspection Handler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let status: jest.Mock;
  let json: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn(() => ({ json }));
    req = {
      body: {},
      headers: {},
    };
    res = {
      status,
      json,
      setHeader: jest.fn(),
    };
    (clients.resolveClientAuthentication as jest.Mock).mockReturnValue({ client: { clientId: 'test-client' } });
    (issuer.getIssuer as jest.Mock).mockReturnValue('http://localhost:8080');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 for invalid request body', async () => {
    req.body = { token: '' }; // Invalid body
    await introspectionHandler(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_request' }));
  });

  it('should return 401 for invalid client authentication', async () => {
    (clients.resolveClientAuthentication as jest.Mock).mockReturnValue(null);
    req.body = { token: 'some-token' };
    await introspectionHandler(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'invalid_client' });
  });

  it('should return active:false for a completely invalid token', async () => {
    req.body = { token: 'invalid-token' };
    (jwt.verifyAccess as jest.Mock).mockRejectedValue(new Error('access error'));
    (jwt.verifyRefresh as jest.Mock).mockRejectedValue(new Error('refresh error'));
    await introspectionHandler(req as Request, res as Response);
    expect(json).toHaveBeenCalledWith({ active: false });
  });

  it('should return active:false for a revoked token', async () => {
    req.body = { token: 'revoked-token' };
    const decoded = { jti: 'revoked-jti' };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue(decoded);
    (redis.isRevoked as jest.Mock).mockResolvedValue(true);
    await introspectionHandler(req as Request, res as Response);
    expect(json).toHaveBeenCalledWith({ active: false });
  });

  it('should return full details for a valid access token', async () => {
    req.body = { token: 'valid-access-token' };
    const decoded = {
      jti: 'valid-jti',
      sub: 'user123',
      client_id: 'test-client',
      scope: 'read write',
      exp: 1234567890,
      iat: 1234567000,
      aud: 'test-client',
      tenant_id: 'default',
      roles: ['user'],
    };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue(decoded);
    (redis.isRevoked as jest.Mock).mockResolvedValue(false);

    await introspectionHandler(req as Request, res as Response);

    expect(json).toHaveBeenCalledWith({
      active: true,
      token_type: 'access_token',
      client_id: 'test-client',
      scope: 'read write',
      sub: 'user123',
      iss: 'http://localhost:8080',
      exp: 1234567890,
      iat: 1234567000,
      aud: 'test-client',
      tenant_id: 'default',
      roles: ['user'],
    });
  });

  it('should return full details for a valid refresh token', async () => {
    req.body = { token: 'valid-refresh-token' };
    const decoded = {
        jti: 'valid-refresh-jti',
        sub: 'user456',
        client_id: 'test-client-refresh',
        scope: 'offline_access',
        exp: 1234599999,
        iat: 1234567000,
        aud: 'test-client-refresh',
        tenant_id: 'default',
        roles: ['guest'],
      };
    (jwt.verifyAccess as jest.Mock).mockRejectedValue(new Error('not an access token'));
    (jwt.verifyRefresh as jest.Mock).mockResolvedValue(decoded);
    (redis.isRevoked as jest.Mock).mockResolvedValue(false);

    await introspectionHandler(req as Request, res as Response);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
        active: true,
        token_type: 'refresh_token',
        sub: 'user456',
    }));
  });

  it('should not include null or undefined fields in the response', async () => {
    req.body = { token: 'valid-access-token' };
    const decoded = {
      jti: 'valid-jti',
      sub: 'user123',
      exp: 1234567890,
      iat: 1234567000,
      // Missing optional fields
      scope: undefined,
      roles: null,
    };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue(decoded);
    (redis.isRevoked as jest.Mock).mockResolvedValue(false);

    await introspectionHandler(req as Request, res as Response);

    const response = json.mock.calls[0][0];
    expect(response).toHaveProperty('active', true);
    expect(response).not.toHaveProperty('scope');
    expect(response).not.toHaveProperty('roles');
  });
});
