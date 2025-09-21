import { loginUser } from '../../internal/services/login.service';
import type { User } from '../../internal/types/db';
import { getUserByEmail, getUserRoles } from '../../internal/adapters/db/pg.adapter';
import { verifyPassword } from '../../internal/security/crypto';
import { issueTokenPair, verifyRefresh } from '../../internal/security/jwt';
import { saveSession } from '../../internal/adapters/redis/redis.adapter';

jest.mock('../../internal/adapters/db/pg.adapter');
jest.mock('../../internal/security/crypto');
jest.mock('../../internal/security/jwt');
jest.mock('../../internal/adapters/redis/redis.adapter');

const mockGetUserByEmail = getUserByEmail as jest.Mock;
const mockGetUserRoles = getUserRoles as jest.Mock;
const mockVerifyPassword = verifyPassword as jest.Mock;
const mockIssueTokenPair = issueTokenPair as jest.Mock;
const mockVerifyRefresh = verifyRefresh as jest.Mock;
const mockSaveSession = saveSession as jest.Mock;

describe('Login Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyRefresh.mockResolvedValue({ jti: 'mock-jti' });
    mockSaveSession.mockResolvedValue(undefined);
  });

  it('should throw "Credenciales inválidas" if user does not exist', async () => {
    mockGetUserByEmail.mockResolvedValue(null);

    await expect(loginUser('nonexistent@example.com', 'password', 'default')).rejects.toThrow('Credenciales inválidas');

    expect(mockGetUserByEmail).toHaveBeenCalledWith('nonexistent@example.com', 'default');
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(mockIssueTokenPair).not.toHaveBeenCalled();
  });

  it('should throw "Credenciales inválidas" for incorrect password', async () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      pwd_hash: 'hashed_password',
      name: 'Test User',
      tenant_id: 'default',
      created_at: new Date(),
      updated_at: new Date()
    };
    mockGetUserByEmail.mockResolvedValue(mockUser);
    mockVerifyPassword.mockResolvedValue(false);

    await expect(loginUser('test@example.com', 'wrong_password', 'default')).rejects.toThrow('Credenciales inválidas');

    expect(mockGetUserByEmail).toHaveBeenCalledWith('test@example.com', 'default');
    expect(mockVerifyPassword).toHaveBeenCalledWith('hashed_password', 'wrong_password');
    expect(mockIssueTokenPair).not.toHaveBeenCalled();
  });

  it('should return token pair and user info on successful login', async () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      pwd_hash: 'hashed_password',
      name: 'Test User',
      tenant_id: 'default',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mockTokenPair = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresIn: 3600,
      accessKid: 'access-kid-123',
      refreshKid: 'refresh-kid-123',
    };
    mockGetUserByEmail.mockResolvedValue(mockUser);
    mockVerifyPassword.mockResolvedValue(true);
    mockGetUserRoles.mockResolvedValue(['user']);
    mockIssueTokenPair.mockResolvedValue(mockTokenPair);

    const result = await loginUser('test@example.com', 'correct_password', 'default');

    expect(result.accessToken).toBe(mockTokenPair.accessToken);
    expect(result.refreshToken).toBe(mockTokenPair.refreshToken);
    expect(result.expiresIn).toBe(mockTokenPair.expiresIn);
    expect(result.roles).toEqual(['user']);
    expect(mockGetUserByEmail).toHaveBeenCalledWith('test@example.com', 'default');
    expect(mockVerifyPassword).toHaveBeenCalledWith('hashed_password', 'correct_password');
    expect(mockGetUserRoles).toHaveBeenCalledWith('1', 'default');
    expect(mockIssueTokenPair).toHaveBeenCalledWith({
      sub: mockUser.id,
      tenant_id: mockUser.tenant_id,
      roles: ['user'],
    });
    expect(mockSaveSession).toHaveBeenCalled();
  });

  it('should assign default role if no roles are found', async () => {
    const mockUser: User = {
      id: '2',
      email: 'noroles@example.com',
      pwd_hash: 'hashed_password',
      name: 'No Roles User',
      tenant_id: 'default',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mockTokenPair = { accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 };
    mockGetUserByEmail.mockResolvedValue(mockUser);
    mockVerifyPassword.mockResolvedValue(true);
    mockGetUserRoles.mockResolvedValue([]); // No roles returned
    mockIssueTokenPair.mockResolvedValue(mockTokenPair);

    await loginUser('noroles@example.com', 'password', 'default');

    expect(mockIssueTokenPair).toHaveBeenCalledWith(expect.objectContaining({
      roles: ['user'], // 'user' is the default role
    }));
  });
});
