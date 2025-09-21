import { Request, Response } from 'express';
import { createRequest, createResponse } from 'node-mocks-http';
import { openIdConfigurationHandler } from '../../internal/adapters/http/openid-configuration.handler';
import { getIssuer, issuerUrl } from '../../internal/config/issuer';
import * as clients from '../../internal/oauth/clients';

jest.mock('../../internal/config/issuer', () => ({
  getIssuer: jest.fn(),
  issuerUrl: jest.fn((path: string) => `http://localhost:3000${path}`),
}));
jest.mock('../../internal/oauth/clients');

const mockedGetIssuer = getIssuer as jest.Mock;
const mockedIssuerUrl = issuerUrl as jest.Mock;
const mockedListOAuthClients = clients.listOAuthClients as jest.Mock;
const mockedGetSupportedScopes = clients.getSupportedScopes as jest.Mock;
const mockedGetTokenEndpointAuthMethods =
  clients.getTokenEndpointAuthMethods as jest.Mock;

describe('OpenID Configuration Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the OpenID configuration', async () => {
    const issuer = 'http://localhost:3000';
    mockedGetIssuer.mockReturnValue(issuer);
    mockedIssuerUrl.mockImplementation((path: string) => `${issuer}${path}`);
    mockedListOAuthClients.mockReturnValue([
      {
        responseTypes: ['code'],
        grantTypes: ['authorization_code'],
        requirePkce: true,
      },
    ]);
    mockedGetSupportedScopes.mockReturnValue(['openid', 'profile']);
    mockedGetTokenEndpointAuthMethods.mockReturnValue([
      'client_secret_basic',
      'none',
    ]);

    const req = createRequest<Request>();
    const res = createResponse<Response>();

    await openIdConfigurationHandler(req as Request, res as Response);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      introspection_endpoint: `${issuer}/introspection`,
      revocation_endpoint: `${issuer}/revocation`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      scopes_supported: ['openid', 'profile'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      service_documentation: 'https://github.com/smartedify/SmartEdify_V0/blob/main/docs/README.md',
      claims_supported: ['sub', 'tenant_id', 'roles', 'email', 'name', 'scope'],
      response_modes_supported: ['query'],
      introspection_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
      revocation_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
    });
  });

  it('should handle empty clients list gracefully', async () => {
    const issuer = 'http://localhost:3000';
    mockedGetIssuer.mockReturnValue(issuer);
    mockedIssuerUrl.mockImplementation((path: string) => `${issuer}${path}`);
    mockedListOAuthClients.mockReturnValue([]);
    mockedGetSupportedScopes.mockReturnValue([]);
    mockedGetTokenEndpointAuthMethods.mockReturnValue([]);

    const req = createRequest<Request>();
    const res = createResponse<Response>();

    await openIdConfigurationHandler(req as Request, res as Response);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      introspection_endpoint: `${issuer}/introspection`,
      revocation_endpoint: `${issuer}/revocation`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: [],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      service_documentation: 'https://github.com/smartedify/SmartEdify_V0/blob/main/docs/README.md',
      claims_supported: ['sub', 'tenant_id', 'roles', 'email', 'name', 'scope'],
      response_modes_supported: ['query'],
      introspection_endpoint_auth_methods_supported: [],
      revocation_endpoint_auth_methods_supported: [],
    });
  });

  it('should correctly aggregate response types and grant types', async () => {
    const issuer = 'http://localhost:3000';
    mockedGetIssuer.mockReturnValue(issuer);
    mockedIssuerUrl.mockImplementation((path: string) => `${issuer}${path}`);
    mockedListOAuthClients.mockReturnValue([
      {
        responseTypes: ['code', 'token'],
        grantTypes: ['authorization_code', 'implicit', 'refresh_token'],
        requirePkce: true,
      },
    ]);
    mockedGetSupportedScopes.mockReturnValue(['openid']);
    mockedGetTokenEndpointAuthMethods.mockReturnValue(['none']);

    const req = createRequest<Request>();
    const res = createResponse<Response>();

    await openIdConfigurationHandler(req as Request, res as Response);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      introspection_endpoint: `${issuer}/introspection`,
      revocation_endpoint: `${issuer}/revocation`,
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['authorization_code', 'implicit', 'refresh_token'],
      scopes_supported: ['openid'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      service_documentation: 'https://github.com/smartedify/SmartEdify_V0/blob/main/docs/README.md',
      claims_supported: ['sub', 'tenant_id', 'roles', 'email', 'name', 'scope'],
      response_modes_supported: ['query'],
      introspection_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'],
    });
  });

  it('should set code_challenge_methods_supported only if PKCE is required', async () => {
    const issuer = 'http://localhost:3000';
    mockedGetIssuer.mockReturnValue(issuer);
    mockedIssuerUrl.mockImplementation((path: string) => `${issuer}${path}`);
    mockedListOAuthClients.mockReturnValue([
      {
        responseTypes: ['code'],
        grantTypes: ['authorization_code'],
        requirePkce: false,
        codeChallengeMethods: ['plain'],
      },
    ]);
    mockedGetSupportedScopes.mockReturnValue(['openid']);
    mockedGetTokenEndpointAuthMethods.mockReturnValue(['none']);

    const req = createRequest<Request>();
    const res = createResponse<Response>();

    await openIdConfigurationHandler(req as Request, res as Response);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      introspection_endpoint: `${issuer}/introspection`,
      revocation_endpoint: `${issuer}/revocation`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      scopes_supported: ['openid'],
      code_challenge_methods_supported: ['plain'],
      token_endpoint_auth_methods_supported: ['none'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      service_documentation: 'https://github.com/smartedify/SmartEdify_V0/blob/main/docs/README.md',
      claims_supported: ['sub', 'tenant_id', 'roles', 'email', 'name', 'scope'],
      response_modes_supported: ['query'],
      introspection_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'],
    });
  });
});