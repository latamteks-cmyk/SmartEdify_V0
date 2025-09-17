import { createMockUserServiceClient } from './user-service.mock';
import type { UserServiceClient, UserValidationRequest, UserValidationResult } from './user-service.types';

export interface HttpUserServiceClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  retries?: number;
  path?: string;
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.AUTH_USER_SERVICE_TIMEOUT_MS || 3000);
const DEFAULT_RETRIES = Number(process.env.AUTH_USER_SERVICE_RETRIES || 2);
const DEFAULT_PATH = process.env.AUTH_USER_SERVICE_VALIDATE_PATH || '/internal/users/validate';

export function createHttpUserServiceClient(options: HttpUserServiceClientOptions): UserServiceClient {
  const {
    baseUrl,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    path = DEFAULT_PATH,
    headers = {}
  } = options;

  if (!baseUrl) {
    throw new Error('User Service baseUrl is required to create HTTP client');
  }

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const maxAttempts = Math.max(0, retries);

  return {
    async validateUser(request: UserValidationRequest): Promise<UserValidationResult> {
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= maxAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
          let response: Response;
          try {
            response = await fetch(`${normalizedBaseUrl}${normalizedPath}`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                ...headers
              },
              body: JSON.stringify({
                email: request.email,
                tenantId: request.tenantId,
                name: request.name
              }),
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeoutHandle);
          }

          if (response.status === 404) {
            return {
              allowed: false,
              status: 'not_found',
              roles: [],
              permissions: []
            };
          }

          if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            throw new Error(`User Service responded with status ${response.status}${bodyText ? `: ${bodyText}` : ''}`);
          }

          let payload: any = {};
          try {
            payload = await response.json();
          } catch (err) {
            if (process.env.AUTH_TEST_LOGS) {
              console.warn('[user-service] JSON parse failed', (err as Error)?.message);
            }
          }

          const allowed = Boolean(
            payload.allowed ?? payload.isAllowed ?? payload.allowedUser ?? payload.allowed_user ?? true
          );

          const status = typeof payload.status === 'string'
            ? payload.status
            : allowed
              ? 'active'
              : 'denied';

          const roles = Array.isArray(payload.roles)
            ? payload.roles.map((role: unknown) => String(role))
            : [];

          const permissions = Array.isArray(payload.permissions)
            ? payload.permissions.map((permission: unknown) => String(permission))
            : [];

          const metadata = typeof payload.metadata === 'object' && payload.metadata !== null
            ? payload.metadata as Record<string, unknown>
            : undefined;

          return { allowed, status, roles, permissions, metadata };
        } catch (err) {
          lastError = err;
          if (attempt === maxAttempts) {
            break;
          }
          // Backoff pequeño para evitar flood
          await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
        }
      }

      const message = lastError instanceof Error ? lastError.message : 'Unknown error';
      throw new Error(`User Service validation failed after ${maxAttempts + 1} attempts: ${message}`);
    }
  };
}

function resolveDefaultClient(): UserServiceClient {
  const rawMode = process.env.AUTH_USER_SERVICE_MODE
    ?? (process.env.AUTH_USER_SERVICE_URL ? 'http' : 'mock');
  const mode = rawMode.trim().toLowerCase();

  if (mode === 'mock') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('El modo mock del User Service está deshabilitado en producción');
    }
    return createMockUserServiceClient();
  }

  if (mode === 'bypass') {
    return {
      async validateUser(request: UserValidationRequest): Promise<UserValidationResult> {
        return {
          allowed: true,
          status: 'bypass',
          roles: [process.env.AUTH_DEFAULT_ROLE || 'user'],
          permissions: [],
          metadata: { tenantId: request.tenantId, strategy: 'bypass' }
        };
      }
    };
  }

  if (mode !== 'http' && mode !== 'auto' && mode !== '') {
    const warning = `[user-service] Modo desconocido "${mode}", usando mock`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(warning);
    }
    if (process.env.AUTH_TEST_LOGS) {
      console.warn(warning);
    }
    return createMockUserServiceClient();
  }

  const baseUrl = process.env.AUTH_USER_SERVICE_URL;
  if (!baseUrl) {
    const message = 'AUTH_USER_SERVICE_URL debe configurarse cuando AUTH_USER_SERVICE_MODE=http';
    if (mode === 'http' || process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }
    if (process.env.AUTH_TEST_LOGS) {
      console.warn(`[user-service] ${message}; usando mock como fallback`);
    }
    return createMockUserServiceClient();
  }

  const headers: Record<string, string> = {};
  if (process.env.AUTH_USER_SERVICE_API_KEY) {
    headers['x-api-key'] = process.env.AUTH_USER_SERVICE_API_KEY;
  }

  return createHttpUserServiceClient({
    baseUrl,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    path: DEFAULT_PATH,
    headers
  });
}

let activeClient: UserServiceClient = resolveDefaultClient();

export function getUserServiceClient(): UserServiceClient {
  return activeClient;
}

export function setUserServiceClient(client: UserServiceClient): void {
  activeClient = client;
}

export function resetUserServiceClient(): void {
  activeClient = resolveDefaultClient();
}
