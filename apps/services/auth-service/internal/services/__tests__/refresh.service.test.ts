import { refresh } from '../refresh.service';
import * as jwt from '../../security/jwt';

jest.mock('../../security/jwt');

describe('refresh', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a new token pair for a valid refresh token', async () => {
    (jwt.rotateRefresh as jest.Mock).mockResolvedValue({ accessToken: 'new_access_token', refreshToken: 'new_refresh_token', expiresIn: 3600 });

    const result = await refresh('valid_refresh_token');

    expect(result).toHaveProperty('accessToken', 'new_access_token');
    expect(jwt.rotateRefresh).toHaveBeenCalledWith('valid_refresh_token');
  });

  it('should throw an error for an invalid or expired refresh token', async () => {
    (jwt.rotateRefresh as jest.Mock).mockResolvedValue(null);

    await expect(refresh('invalid_refresh_token')).rejects.toThrow('Refresh token inválido o expirado');
  });
});
