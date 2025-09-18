import { z } from 'zod';

export type TokenEndpointAuthMethod = 'none' | 'client_secret_basic' | 'client_secret_post';

export interface OAuthClient {
  clientId: string;
  name: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  allowedScopes: string[];
  defaultScopes: string[];
  requirePkce: boolean;
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  clientSecret?: string;
}

const RawClientSchema = z.object({
  client_id: z.string().min(1),
  name: z.string().min(1).default('OAuth Client'),
  redirect_uris: z.array(z.string().min(1)).min(1),
  grant_types: z.array(z.string().min(1)).default(['authorization_code']),
  response_types: z.array(z.string().min(1)).default(['code']),
  scopes: z.array(z.string().min(1)).default(['openid']),
  default_scopes: z.array(z.string().min(1)).optional(),
  require_pkce: z.boolean().optional(),
  token_endpoint_auth_method: z
    .enum(['none', 'client_secret_basic', 'client_secret_post'])
    .default('none'),
  client_secret: z.string().optional()
});

function unique<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean))) as T[];
}

function sanitizeRedirects(uris: string[]): string[] {
  const valid: string[] = [];
  for (const uri of uris) {
    try {
      // eslint-disable-next-line no-new
      new URL(uri);
      valid.push(uri);
    } catch (e) {
      if (process.env.AUTH_TEST_LOGS) {
        console.warn('[oauth] redirect_uri inválida descartada', uri);
      }
    }
  }
  return unique(valid);
}

function parseEnvClients(): OAuthClient[] {
  const raw = process.env.AUTH_OAUTH_CLIENTS;
  if (!raw) return buildDefaultClients();
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const clients: OAuthClient[] = [];
    for (const item of arr) {
      const result = RawClientSchema.safeParse(item);
      if (!result.success) {
        if (process.env.AUTH_TEST_LOGS) {
          console.error('[oauth] configuración de cliente inválida', result.error.flatten());
        }
        continue;
      }
      const value = result.data;
      const redirectUris = sanitizeRedirects(value.redirect_uris);
      if (!redirectUris.length) continue;
      clients.push({
        clientId: value.client_id,
        name: value.name,
        redirectUris,
        grantTypes: unique(value.grant_types),
        responseTypes: unique(value.response_types),
        allowedScopes: unique(value.scopes),
        defaultScopes: unique(value.default_scopes && value.default_scopes.length ? value.default_scopes : value.scopes),
        requirePkce: value.require_pkce !== false,
        tokenEndpointAuthMethod: value.token_endpoint_auth_method,
        clientSecret: value.client_secret
      });
    }
    return clients.length ? clients : buildDefaultClients();
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) {
      console.error('[oauth] AUTH_OAUTH_CLIENTS inválido. Usando defaults.', e);
    }
    return buildDefaultClients();
  }
}

function buildDefaultClients(): OAuthClient[] {
  const defaultRedirect = process.env.AUTH_DEFAULT_REDIRECT_URI || 'https://www.smart-edify.com/auth/callback';
  const localRedirect = process.env.AUTH_LOCAL_REDIRECT_URI;
  const redirects = sanitizeRedirects(unique([defaultRedirect, localRedirect].filter(Boolean) as string[]));
  if (!redirects.length) {
    redirects.push('https://www.smart-edify.com/auth/callback');
  }
  const baseScopes = process.env.AUTH_DEFAULT_SCOPES
    ? unique(process.env.AUTH_DEFAULT_SCOPES.split(/\s+/))
    : ['openid', 'profile', 'email', 'offline_access'];
  return [
    {
      clientId: process.env.AUTH_DEFAULT_CLIENT_ID || 'squarespace',
      name: 'Squarespace Portal',
      redirectUris: redirects,
      grantTypes: ['authorization_code', 'refresh_token'],
      responseTypes: ['code'],
      allowedScopes: baseScopes,
      defaultScopes: baseScopes,
      requirePkce: true,
      tokenEndpointAuthMethod: 'none'
    }
  ];
}

const oauthClients = parseEnvClients();

export function listOAuthClients(): OAuthClient[] {
  return oauthClients;
}

export function findClientById(clientId: string | undefined | null): OAuthClient | undefined {
  if (!clientId) return undefined;
  return oauthClients.find(client => client.clientId === clientId);
}

export function clientSupportsGrant(client: OAuthClient, grantType: string): boolean {
  return client.grantTypes.includes(grantType);
}

export function clientSupportsResponseType(client: OAuthClient, responseType: string): boolean {
  return client.responseTypes.includes(responseType);
}

export function isRedirectUriAllowed(client: OAuthClient, redirectUri: string): boolean {
  if (!redirectUri) return false;
  try {
    // eslint-disable-next-line no-new
    new URL(redirectUri);
  } catch {
    return false;
  }
  return client.redirectUris.includes(redirectUri);
}

export function normalizeScopes(scope?: string | string[] | null): string[] {
  if (!scope) return [];
  if (Array.isArray(scope)) return unique(scope.flatMap(s => s.split(/\s+/)).filter(Boolean));
  return unique(scope.split(/\s+/).filter(Boolean));
}

export function hasAllScopes(client: OAuthClient, requested: string[]): boolean {
  if (!requested.length) return true;
  const allowed = new Set(client.allowedScopes);
  return requested.every(scope => allowed.has(scope));
}

export function getDefaultScopes(client: OAuthClient): string[] {
  return client.defaultScopes && client.defaultScopes.length ? client.defaultScopes : client.allowedScopes;
}

export function getSupportedScopes(): string[] {
  const acc = new Set<string>();
  for (const client of oauthClients) {
    for (const scope of client.allowedScopes) {
      acc.add(scope);
    }
  }
  return Array.from(acc.values()).sort();
}

export function getTokenEndpointAuthMethods(): TokenEndpointAuthMethod[] {
  return unique(oauthClients.map(c => c.tokenEndpointAuthMethod));
}

export interface ClientAuthenticationResult {
  client: OAuthClient;
  method: 'none' | 'basic' | 'post';
}

function parseBasicCredentials(authorization?: string | null): { clientId: string; clientSecret: string } | null {
  if (!authorization || !authorization.startsWith('Basic ')) return null;
  const encoded = authorization.slice('Basic '.length).trim();
  if (!encoded) return null;
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const index = decoded.indexOf(':');
    if (index === -1) return null;
    return {
      clientId: decoded.slice(0, index),
      clientSecret: decoded.slice(index + 1)
    };
  } catch {
    return null;
  }
}

export function resolveClientAuthentication(options: {
  authorizationHeader?: string;
  bodyClientId?: string | null;
  bodyClientSecret?: string | null;
}): ClientAuthenticationResult | null {
  const basic = parseBasicCredentials(options.authorizationHeader);
  if (basic) {
    const client = findClientById(basic.clientId);
    if (!client) return null;
    if (client.tokenEndpointAuthMethod === 'none') {
      return null;
    }
    if (!client.clientSecret || client.clientSecret !== basic.clientSecret) {
      return null;
    }
    return { client, method: 'basic' };
  }

  const clientId = options.bodyClientId || undefined;
  const client = findClientById(clientId);
  if (!client) return null;

  switch (client.tokenEndpointAuthMethod) {
    case 'client_secret_basic':
      return null;
    case 'client_secret_post':
      if (!client.clientSecret || client.clientSecret !== (options.bodyClientSecret || '')) {
        return null;
      }
      return { client, method: 'post' };
    case 'none':
    default:
      if (client.clientSecret && options.bodyClientSecret && client.clientSecret !== options.bodyClientSecret) {
        return null;
      }
      return { client, method: 'none' };
  }
}
