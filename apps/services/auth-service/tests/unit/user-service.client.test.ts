import {
  createHttpUserServiceClient,
  getUserServiceClient,
  resetUserServiceClient,
  setUserServiceClient,
} from '../../internal/adapters/user-service.client';
import type { UserServiceClient } from '../../internal/adapters/user-service.types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('User Service Client', () => {
  const baseUrl = 'http://user-service.test';

  beforeEach(() => {
    jest.clearAllMocks();
    resetUserServiceClient();
    // Reset environment variables
    delete process.env.AUTH_USER_SERVICE_MODE;
    delete process.env.AUTH_USER_SERVICE_URL;
    delete process.env.AUTH_USER_SERVICE_API_KEY;
  });

  describe('createHttpUserServiceClient', () => {
    it('should throw an error if baseUrl is not provided', () => {
      expect(() => createHttpUserServiceClient({ baseUrl: '' })).toThrow(
        'User Service baseUrl is required to create HTTP client'
      );
    });

    it('should return a successful validation result', async () => {
      const client = createHttpUserServiceClient({ baseUrl });
      const responsePayload = {
        allowed: true,
        status: 'active',
        roles: ['user'],
        permissions: ['read'],
        metadata: { id: '123' },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responsePayload),
      });

      const result = await client.validateUser({ email: 'test@example.com', tenantId: 'default' });

      expect(result).toEqual(responsePayload);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(baseUrl), expect.any(Object));
    });

    it('should handle 404 Not Found response', async () => {
      const client = createHttpUserServiceClient({ baseUrl });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await client.validateUser({ email: 'test@example.com', tenantId: 'default' });

      expect(result).toEqual({
        allowed: false,
        status: 'not_found',
        roles: [],
        permissions: [],
      });
    });

    it('should throw an error for non-ok responses other than 404', async () => {
      const client = createHttpUserServiceClient({ baseUrl });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(client.validateUser({ email: 'test@example.com', tenantId: 'default' })).rejects.toThrow(
        'User Service validation failed after 3 attempts: User Service responded with status 500: Internal Server Error'
      );
    });

    it('should retry on failure', async () => {
      const client = createHttpUserServiceClient({ baseUrl, retries: 2 });
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ allowed: true }),
        });

      const result = await client.validateUser({ email: 'test@example.com', tenantId: 'default' });

      expect(result.allowed).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Client Resolution', () => {
    it('should resolve to mock client when mode is "mock"', () => {
      process.env.AUTH_USER_SERVICE_MODE = 'mock';
      const client = getUserServiceClient();
      expect((client as any).__isMock).toBe(true);
    });

    it('should resolve to bypass client when mode is "bypass"', async () => {
      process.env.AUTH_USER_SERVICE_MODE = 'bypass';
      resetUserServiceClient(); // Reset to pick up the new environment variable
      const client = getUserServiceClient();
      const result = await client.validateUser({ email: 'test@demo.com', tenantId: 'default' });
      expect(result.status).toBe('bypass');
    });

    it('should resolve to http client when mode is "http" and URL is set', () => {
      process.env.AUTH_USER_SERVICE_MODE = 'http';
      process.env.AUTH_USER_SERVICE_URL = baseUrl;
      const client = getUserServiceClient();
      expect((client as any).__isMock).toBeUndefined();
    });

    it('should throw error when mode is "http" and URL is not set', () => {
      // Set up a valid configuration first to avoid errors in beforeEach
      const originalMode = process.env.AUTH_USER_SERVICE_MODE;
      process.env.AUTH_USER_SERVICE_MODE = 'mock';
      resetUserServiceClient();
      
      // Now test the error case
      process.env.AUTH_USER_SERVICE_MODE = 'http';
      // In test environment, we need to force it to throw
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(() => resetUserServiceClient()).toThrow(
        'AUTH_USER_SERVICE_URL debe configurarse cuando AUTH_USER_SERVICE_MODE=http'
      );
      process.env.NODE_ENV = originalNodeEnv;
      
      // Restore original values
      process.env.AUTH_USER_SERVICE_MODE = originalMode;
      resetUserServiceClient();
    });
  });

  describe('setUserServiceClient', () => {
    it('should allow overriding the default client', () => {
      // Set up a valid configuration to avoid errors during reset
      const originalMode = process.env.AUTH_USER_SERVICE_MODE;
      process.env.AUTH_USER_SERVICE_MODE = 'mock';
      resetUserServiceClient(); // Reset with valid configuration
      
      const mockClient = {
        validateUser: jest.fn().mockResolvedValue({ allowed: true }),
        __isMock: true,
      };

      setUserServiceClient(mockClient);
      const client = getUserServiceClient();

      expect(client).toBe(mockClient);
      
      // Restore original values
      process.env.AUTH_USER_SERVICE_MODE = originalMode;
    });

    it('should resolve to the default client after reset', () => {
      // Set up a valid configuration to avoid errors during reset
      const originalMode = process.env.AUTH_USER_SERVICE_MODE;
      process.env.AUTH_USER_SERVICE_MODE = 'mock';
      resetUserServiceClient(); // Reset with valid configuration
      
      const mockClient = {
        validateUser: jest.fn(),
        __isMock: true,
      };

      setUserServiceClient(mockClient);
      process.env.AUTH_USER_SERVICE_MODE = 'mock'; // Ensure valid mode for reset
      resetUserServiceClient(); // Reset to default client
      
      const client = getUserServiceClient();

      expect(client).not.toBe(mockClient);
      expect((client as any).__isMock).toBe(true);
      
      // Restore original values
      process.env.AUTH_USER_SERVICE_MODE = originalMode;
    });
  });
});
