import { resetPassword } from '../reset-password.service';
import * as redis from '../../adapters/redis/redis.adapter';
import * as pg from '@db/pg.adapter';
import * as crypto from '../../security/crypto';

jest.mock('../../adapters/redis/redis.adapter');
jest.mock('@db/pg.adapter');
jest.mock('../../security/crypto');

describe('resetPassword', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reset the password for a valid token', async () => {
    (redis.consumePasswordResetToken as jest.Mock).mockResolvedValue({ userId: '1' });
    (pg.getUserById as jest.Mock).mockResolvedValue({ id: '1' });
    (crypto.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');
    (pg.pool.query as jest.Mock).mockResolvedValue(undefined);
    (redis.revokeAllUserSessions as jest.Mock).mockResolvedValue(undefined);

    await resetPassword('valid_token', 'new_password');

    expect(redis.consumePasswordResetToken).toHaveBeenCalledWith('valid_token');
    expect(pg.getUserById).toHaveBeenCalledWith('1');
    expect(crypto.hashPassword).toHaveBeenCalledWith('new_password');
    expect(pg.pool.query).toHaveBeenCalled();
    expect(redis.revokeAllUserSessions).toHaveBeenCalledWith('1');
  });

  it('should throw an error for an invalid or expired token', async () => {
    (redis.consumePasswordResetToken as jest.Mock).mockResolvedValue(null);

    await expect(resetPassword('invalid_token', 'new_password')).rejects.toThrow('Token inválido o expirado');
  });

  it('should throw an error if the user is not found', async () => {
    (redis.consumePasswordResetToken as jest.Mock).mockResolvedValue({ userId: '1' });
    (pg.getUserById as jest.Mock).mockResolvedValue(null);

    await expect(resetPassword('valid_token', 'new_password')).rejects.toThrow('Usuario no encontrado');
  });
});
