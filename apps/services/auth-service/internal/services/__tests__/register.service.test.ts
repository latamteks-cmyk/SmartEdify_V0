import { registerUser } from '../register.service';
import * as pgAdapter from '@db/pg.adapter';
import * as userService from '../../adapters/user-service.client';
import * as crypto from '../../security/crypto';

jest.mock('@db/pg.adapter');
jest.mock('../../adapters/user-service.client');
jest.mock('../../security/crypto');

describe('registerUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    (userService.getUserServiceClient as jest.Mock).mockReturnValue({ validateUser: jest.fn().mockResolvedValue({ allowed: true }) });
    (pgAdapter.getUserByEmail as jest.Mock).mockResolvedValue(null);
    (crypto.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
    (pgAdapter.createUser as jest.Mock).mockResolvedValue({ id: '1' });
    (pgAdapter.assignUserRole as jest.Mock).mockResolvedValue(undefined);
    (pgAdapter.getUserRoles as jest.Mock).mockResolvedValue(['user']);

    const result = await registerUser('test@example.com', 'password', 'Test User', 'default');

    expect(result).toHaveProperty('id', '1');
    expect(pgAdapter.createUser).toHaveBeenCalled();
    expect(pgAdapter.assignUserRole).toHaveBeenCalled();
  });

  it('should throw error if user already exists', async () => {
    (userService.getUserServiceClient as jest.Mock).mockReturnValue({ validateUser: jest.fn().mockResolvedValue({ allowed: true }) });
    (pgAdapter.getUserByEmail as jest.Mock).mockResolvedValue({ id: '1' });

    await expect(registerUser('existing@example.com', 'password', 'Existing User', 'default')).rejects.toThrow('El usuario ya existe');
  });

  it('should throw error if user service validation fails', async () => {
    (userService.getUserServiceClient as jest.Mock).mockReturnValue({ validateUser: jest.fn().mockResolvedValue({ allowed: false }) });

    await expect(registerUser('disallowed@example.com', 'password', 'Disallowed User', 'default')).rejects.toThrow('Usuario no permitido por User Service');
  });

  it('should throw error if user service is unavailable', async () => {
    (userService.getUserServiceClient as jest.Mock).mockReturnValue({ validateUser: jest.fn().mockRejectedValue(new Error('Service unavailable')) });

    await expect(registerUser('test@example.com', 'password', 'Test User', 'default')).rejects.toThrow('User Service no disponible');
  });
});
