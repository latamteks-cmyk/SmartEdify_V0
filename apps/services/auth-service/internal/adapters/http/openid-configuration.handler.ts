import { Request, Response } from 'express';
import { getIssuer, issuerUrl } from '../../config/issuer';
import { getSupportedScopes, getTokenEndpointAuthMethods, listOAuthClients } from '../../oauth/clients';

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export async function openIdConfigurationHandler(_req: Request, res: Response) {
  const issuer = getIssuer();
  const clients = listOAuthClients();
  const responseTypes = unique(clients.flatMap(client => client.responseTypes));
  const grantTypes = unique(clients.flatMap(client => client.grantTypes));
  const scopes = getSupportedScopes();
  const tokenAuthMethods = getTokenEndpointAuthMethods();
  const codeChallengeMethods = new Set<string>();
  let allowPlain = false;
  for (const client of clients) {
    if (client.requirePkce) {
      codeChallengeMethods.add('S256');
    } else {
      allowPlain = true;
    }
  }
  if (allowPlain) codeChallengeMethods.add('plain');
  if (!codeChallengeMethods.size) {
    codeChallengeMethods.add('S256');
  }

  const metadata = {
    issuer,
    authorization_endpoint: issuerUrl('/authorize'),
    token_endpoint: issuerUrl('/token'),
    userinfo_endpoint: issuerUrl('/userinfo'),
    jwks_uri: issuerUrl('/.well-known/jwks.json'),
    introspection_endpoint: issuerUrl('/introspection'),
    revocation_endpoint: issuerUrl('/revocation'),
    response_types_supported: responseTypes.length ? responseTypes : ['code'],
    grant_types_supported: grantTypes.length ? grantTypes : ['authorization_code', 'refresh_token'],
    scopes_supported: scopes.length ? scopes : ['openid', 'profile', 'email', 'offline_access'],
    code_challenge_methods_supported: Array.from(codeChallengeMethods.values()),
    token_endpoint_auth_methods_supported: tokenAuthMethods,
    response_modes_supported: ['query'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    claims_supported: ['sub', 'tenant_id', 'roles', 'email', 'name', 'scope'],
    service_documentation: 'https://github.com/smartedify/SmartEdify_V0/blob/main/docs/README.md',
    revocation_endpoint_auth_methods_supported: tokenAuthMethods,
    introspection_endpoint_auth_methods_supported: tokenAuthMethods
  };

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  return res.json(metadata);
}
