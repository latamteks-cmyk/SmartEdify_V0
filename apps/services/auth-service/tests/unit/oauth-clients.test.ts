
import type { OAuthClient } from '../../internal/oauth/clients';

// Necesitamos importar dinámicamente el módulo en cada prueba
// para permitir el mocking de process.env
let listOAuthClients: any;
let findClientById: any;
let clientSupportsGrant: any;
let clientSupportsResponseType: any;
let isRedirectUriAllowed: any;
let normalizeScopes: any;
let hasAllScopes: any;
let getDefaultScopes: any;
let getSupportedScopes: any;
let getTokenEndpointAuthMethods: any;
let resolveClientAuthentication: any;

describe('OAuth Clients', () => {
  const originalClients = process.env.AUTH_OAUTH_CLIENTS;

  beforeEach(async () => {
    jest.resetModules();
    process.env.AUTH_OAUTH_CLIENTS = JSON.stringify([
      {
        client_id: 'test-client-1',
        name: 'Test Client 1',
        redirect_uris: ['https://client.one/callback', 'http://localhost:8080'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scopes: ['openid', 'profile', 'api:read'],
        default_scopes: ['openid', 'profile'],
        require_pkce: true,
        token_endpoint_auth_method: 'none',
      },
      {
        client_id: 'test-client-2',
        name: 'Test Client 2',
        redirect_uris: ['https://client.two/callback'],
        grant_types: ['client_credentials'],
        response_types: [],
        scopes: ['api:write', 'api:read'],
        token_endpoint_auth_method: 'client_secret_post',
        client_secret: 'super-secret',
      },
    ]);

    // Importar dinámicamente el módulo
    const clientsModule = await import('../../internal/oauth/clients');
    listOAuthClients = clientsModule.listOAuthClients;
    findClientById = clientsModule.findClientById;
    clientSupportsGrant = clientsModule.clientSupportsGrant;
    clientSupportsResponseType = clientsModule.clientSupportsResponseType;
    isRedirectUriAllowed = clientsModule.isRedirectUriAllowed;
    normalizeScopes = clientsModule.normalizeScopes;
    hasAllScopes = clientsModule.hasAllScopes;
    getDefaultScopes = clientsModule.getDefaultScopes;
    getSupportedScopes = clientsModule.getSupportedScopes;
    getTokenEndpointAuthMethods = clientsModule.getTokenEndpointAuthMethods;
    resolveClientAuthentication = clientsModule.resolveClientAuthentication;
  });

  afterAll(() => {
    process.env.AUTH_OAUTH_CLIENTS = originalClients;
  });

  describe('listOAuthClients', () => {
    it('should parse and list clients from environment variables', async () => {
      const clients = await listOAuthClients();
      expect(clients).toHaveLength(2);
      expect(clients[0].clientId).toBe('test-client-1');
      expect(clients[1].clientId).toBe('test-client-2');
    });
  });

  describe('findClientById', () => {
    it('should find a client by its ID', async () => {
      const client = await findClientById('test-client-1');
      expect(client).toBeDefined();
      expect(client?.name).toBe('Test Client 1');
    });

    it('should return undefined for a non-existent client ID', async () => {
      const client = await findClientById('non-existent');
      expect(client).toBeUndefined();
    });

    it('should return undefined for a null or undefined client ID', async () => {
      expect(await findClientById(null)).toBeUndefined();
      expect(await findClientById(undefined)).toBeUndefined();
    });
  });

  describe('Client Feature Support', () => {
    let client1: OAuthClient;
    let client2: OAuthClient;

    beforeEach(async () => {
      client1 = (await findClientById('test-client-1'))!;
      client2 = (await findClientById('test-client-2'))!;
    });

    it('clientSupportsGrant', () => {
      expect(clientSupportsGrant(client1, 'authorization_code')).toBe(true);
      expect(clientSupportsGrant(client1, 'client_credentials')).toBe(false);
      expect(clientSupportsGrant(client2, 'client_credentials')).toBe(true);
    });

    it('clientSupportsResponseType', () => {
      expect(clientSupportsResponseType(client1, 'code')).toBe(true);
      expect(clientSupportsResponseType(client1, 'token')).toBe(false);
      expect(clientSupportsResponseType(client2, 'code')).toBe(false);
    });

    it('isRedirectUriAllowed', () => {
      expect(isRedirectUriAllowed(client1, 'https://client.one/callback')).toBe(
        true,
      );
      expect(isRedirectUriAllowed(client1, 'http://localhost:8080')).toBe(true);
      expect(
        isRedirectUriAllowed(client1, 'https://attacker.com/callback'),
      ).toBe(false);
      expect(isRedirectUriAllowed(client1, '')).toBe(false);
      expect(isRedirectUriAllowed(client1, 'not-a-url')).toBe(false);
    });
  });

  describe('Scope Handling', () => {
    let client1: OAuthClient;

    beforeEach(async () => {
      client1 = (await findClientById('test-client-1'))!;
    });

    it('normalizeScopes', () => {
      expect(normalizeScopes('openid profile')).toEqual(['openid', 'profile']);
      expect(normalizeScopes(['openid profile', 'email'])).toEqual([
        'openid',
        'profile',
        'email',
      ]);
      expect(normalizeScopes(null)).toEqual([]);
      expect(normalizeScopes(undefined)).toEqual([]);
      expect(normalizeScopes('')).toEqual([]);
    });

    it('hasAllScopes', () => {
      expect(hasAllScopes(client1, ['openid', 'profile'])).toBe(true);
      expect(hasAllScopes(client1, ['openid', 'api:read'])).toBe(true);
      expect(hasAllScopes(client1, ['openid', 'api:write'])).toBe(false);
      expect(hasAllScopes(client1, [])).toBe(true);
    });

    it('getDefaultScopes', async () => {
      const client2 = (await findClientById('test-client-2'))!;
      expect(getDefaultScopes(client1)).toEqual(['openid', 'profile']);
      expect(getDefaultScopes(client2)).toEqual(['api:write', 'api:read']);
    });
  });

  describe('Global Helpers', () => {
    it('getSupportedScopes', async () => {
      const scopes = await getSupportedScopes();
      expect(scopes).toEqual(
        expect.arrayContaining(['openid', 'profile', 'api:read', 'api:write']),
      );
      expect(scopes).toHaveLength(4);
    });

    it('getTokenEndpointAuthMethods', async () => {
      const methods = await getTokenEndpointAuthMethods();
      expect(methods).toEqual(
        expect.arrayContaining(['none', 'client_secret_post']),
      );
      expect(methods).toHaveLength(2);
    });
  });

  describe('resolveClientAuthentication', () => {
    it('should return null if no client can be found', async () => {
      const result = await resolveClientAuthentication({
        bodyClientId: 'unknown',
      });
      expect(result).toBeNull();
    });

    it('should handle "none" auth method correctly', async () => {
      const result = await resolveClientAuthentication({
        bodyClientId: 'test-client-1',
      });
      expect(result).not.toBeNull();
      expect(result?.client.clientId).toBe('test-client-1');
      expect(result?.method).toBe('none');
    });

    it('should handle "client_secret_post" method correctly', async () => {
      const result = await resolveClientAuthentication({
        bodyClientId: 'test-client-2',
        bodyClientSecret: 'super-secret',
      });
      expect(result).not.toBeNull();
      expect(result?.client.clientId).toBe('test-client-2');
      expect(result?.method).toBe('post');
    });

    it('should fail "client_secret_post" with wrong secret', async () => {
      const result = await resolveClientAuthentication({
        bodyClientId: 'test-client-2',
        bodyClientSecret: 'wrong-secret',
      });
      expect(result).toBeNull();
    });

    it('should handle "client_secret_basic" method correctly', async () => {
      // Save original environment
      const originalClients = process.env.AUTH_OAUTH_CLIENTS;
      
      // Reset modules and set up new environment
      jest.resetModules();
      process.env.AUTH_OAUTH_CLIENTS = JSON.stringify([
        {
          client_id: 'basic-client',
          redirect_uris: ['http://localhost'],
          token_endpoint_auth_method: 'client_secret_basic',
          client_secret: 'basic-secret',
        },
      ]);
      
      // Import the module with the new environment
      const { resolveClientAuthentication: updatedResolver } = await import('../../internal/oauth/clients');
      const credentials = Buffer.from('basic-client:basic-secret').toString('base64');
      const result = await updatedResolver({
        authorizationHeader: `Basic ${credentials}`,
      });
      expect(result).not.toBeNull();
      expect(result?.client.clientId).toBe('basic-client');
      expect(result?.method).toBe('basic');
      
      // Restore original environment
      process.env.AUTH_OAUTH_CLIENTS = originalClients;
      jest.resetModules(); // Reset modules to restore original state
    });

    it('should fail "client_secret_basic" with wrong secret', async () => {
      await jest.isolateModules(async () => {
        process.env.AUTH_OAUTH_CLIENTS = JSON.stringify([
          {
            client_id: 'basic-client',
            redirect_uris: ['http://localhost'],
            token_endpoint_auth_method: 'client_secret_basic',
            client_secret: 'basic-secret',
          },
        ]);
        const { resolveClientAuthentication: updatedResolver } = await import('../../internal/oauth/clients');
        const credentials = Buffer.from('basic-client:wrong-secret').toString('base64');
        const result = await updatedResolver({
          authorizationHeader: `Basic ${credentials}`,
        });
        expect(result).toBeNull();
      });
    });

    it('should return null if client requires auth but none provided', async () => {
      await jest.isolateModules(async () => {
        process.env.AUTH_OAUTH_CLIENTS = JSON.stringify([
          {
            client_id: 'basic-client-2',
            redirect_uris: ['http://localhost'],
            token_endpoint_auth_method: 'client_secret_basic',
            client_secret: 'secret',
          },
        ]);
        const { resolveClientAuthentication: updatedResolver } = await import('../../internal/oauth/clients');
        const result = await updatedResolver({
          bodyClientId: 'basic-client-2',
        });
        expect(result).toBeNull();
      });
    });
  });
});
