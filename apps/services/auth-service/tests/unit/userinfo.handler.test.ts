import { userinfoHandler } from '../../internal/adapters/http/userinfo.handler';
import { Request, Response } from 'express';
import * as jwt from '../../internal/security/jwt';
import * as pg from '../../internal/adapters/db/pg.adapter';

jest.mock('../../internal/security/jwt');
jest.mock('../../internal/adapters/db/pg.adapter');

describe('User Info Handler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let status: jest.Mock;
  let json: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn(() => ({ json }));
    req = {
      headers: {},
    };
    res = {
      status,
      json,
      setHeader: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if no Authorization header is provided', async () => {
    await userinfoHandler(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'invalid_token' });
  });

  it('should return 401 if Authorization header is not a Bearer token', async () => {
    req.headers = { authorization: 'Basic some-credentials' };
    await userinfoHandler(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'invalid_token' });
  });

  it('should return 401 if token is empty', async () => {
    req.headers = { authorization: 'Bearer ' };
    await userinfoHandler(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'invalid_token' });
  });

  it('should return 401 for an invalid or expired token', async () => {
    req.headers = { authorization: 'Bearer invalid-token' };
    (jwt.verifyAccess as jest.Mock).mockRejectedValue(new Error('jwt expired'));
    await userinfoHandler(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'invalid_token' });
  });

  it('should return 400 if token payload has no sub', async () => {
    req.headers = { authorization: 'Bearer valid-token-no-sub' };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue({ scope: 'profile' });
    await userinfoHandler(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'invalid_token' });
  });

  it('should return 404 if user is not found', async () => {
    req.headers = { authorization: 'Bearer valid-token-unknown-user' };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue({ sub: 'unknown-user' });
    (pg.getUserById as jest.Mock).mockResolvedValue(null);
    await userinfoHandler(req as Request, res as Response);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'user_not_found' });
  });

  it('should return basic claims for a valid token without profile/email scopes', async () => {
    const tokenPayload = { sub: 'user123', tenant_id: 'tenant-a', roles: ['viewer'] };
    const user = { id: 'user123', name: 'Test User', email: 'test@example.com' };
    req.headers = { authorization: 'Bearer valid-token' };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue(tokenPayload);
    (pg.getUserById as jest.Mock).mockResolvedValue(user);

    await userinfoHandler(req as Request, res as Response);

    expect(json).toHaveBeenCalledWith({
      sub: 'user123',
      tenant_id: 'tenant-a',
      roles: ['viewer'],
      scope: undefined,
    });
  });

  it('should include profile claims when "profile" scope is present', async () => {
    const tokenPayload = { sub: 'user123', scope: 'profile' };
    const user = { id: 'user123', name: 'Test User', email: 'test@example.com' };
    req.headers = { authorization: 'Bearer valid-token-profile' };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue(tokenPayload);
    (pg.getUserById as jest.Mock).mockResolvedValue(user);

    await userinfoHandler(req as Request, res as Response);

    const response = json.mock.calls[0][0];
    expect(response).toHaveProperty('name', 'Test User');
    expect(response).not.toHaveProperty('email');
  });

  it('should include email claims when "email" scope is present', async () => {
    const tokenPayload = { sub: 'user123', scope: 'email' };
    const user = { id: 'user123', name: 'Test User', email: 'test@example.com' };
    req.headers = { authorization: 'Bearer valid-token-email' };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue(tokenPayload);
    (pg.getUserById as jest.Mock).mockResolvedValue(user);

    await userinfoHandler(req as Request, res as Response);

    const response = json.mock.calls[0][0];
    expect(response).toHaveProperty('email', 'test@example.com');
    expect(response).toHaveProperty('email_verified', true);
    expect(response).not.toHaveProperty('name');
  });

  it('should include all claims for "profile email" scopes', async () => {
    const tokenPayload = { sub: 'user123', scope: 'profile email openid' };
    const user = { id: 'user123', name: 'Test User', email: 'test@example.com' };
    req.headers = { authorization: 'Bearer valid-token-full' };
    (jwt.verifyAccess as jest.Mock).mockResolvedValue(tokenPayload);
    (pg.getUserById as jest.Mock).mockResolvedValue(user);

    await userinfoHandler(req as Request, res as Response);

    const response = json.mock.calls[0][0];
    expect(response).toHaveProperty('name', 'Test User');
    expect(response).toHaveProperty('email', 'test@example.com');
    expect(response).toHaveProperty('email_verified', true);
    expect(response).toHaveProperty('sub', 'user123');
  });
});
