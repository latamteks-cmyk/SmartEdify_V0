import { loginUser } from '../login.service';
import * as pgAdapter from '@db/pg.adapter';
import * as crypto from '../../security/crypto';
import * as jwt from '../../security/jwt';
import * as redis from '../../adapters/redis/redis.adapter';

jest.mock('@db/pg.adapter');
jest.mock('../../security/crypto');
jest.mock('../../security/jwt');
jest.mock('../../adapters/redis/redis.adapter');

describe('loginUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return tokens for valid credentials', async () => {
    (pgAdapter.getUserByEmail as jest.Mock).mockResolvedValue({ id: '1', pwd_hash: 'hashed_password' });
    (crypto.verifyPassword as jest.Mock).mockResolvedValue(true);
    (pgAdapter.getUserRoles as jest.Mock).mockResolvedValue(['user']);
    (jwt.issueTokenPair as jest.Mock).mockResolvedValue({ accessToken: 'access_token', refreshToken: 'refresh_token', expiresIn: 3600 });
    (jwt.verifyRefresh as jest.Mock).mockResolvedValue({ jti: 'jti' });
    (redis.saveSession as jest.Mock).mockResolvedValue(undefined);

    const result = await loginUser('test@example.com', 'password', 'default');

    expect(result).toHaveProperty('accessToken', 'access_token');
    expect(result).toHaveProperty('refreshToken', 'refresh_token');
    expect(pgAdapter.getUserByEmail).toHaveBeenCalledWith('test@example.com', 'default');
    expect(crypto.verifyPassword).toHaveBeenCalledWith('hashed_password', 'password');
    expect(jwt.issueTokenPair).toHaveBeenCalled();
    expect(redis.saveSession).toHaveBeenCalled();
  });

  it('should throw error for invalid credentials', async () => {
    (pgAdapter.getUserByEmail as jest.Mock).mockResolvedValue({ id: '1', pwd_hash: 'hashed_password' });
    (crypto.verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(loginUser('test@example.com', 'wrong_password', 'default')).rejects.toThrow('Credenciales inválidas');
  });

  it('should throw error for non-existent user', async () => {
    (pgAdapter.getUserByEmail as jest.Mock).mockResolvedValue(null);

    await expect(loginUser('nonexistent@example.com', 'password', 'default')).rejects.toThrow('Credenciales inválidas');
  });
});
