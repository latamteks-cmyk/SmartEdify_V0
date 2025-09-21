import type { UserServiceClient, UserValidationRequest, UserValidationResult } from './user-service.types';

export interface MockUserServiceOptions {
  allowedDomains?: string[];
  blockedEmails?: string[];
  defaultRoles?: string[];
  defaultPermissions?: string[];
}

function buildDeniedResult(): UserValidationResult {
  return {
    allowed: false,
    status: 'rejected',
    roles: [],
    permissions: []
  };
}

export function createMockUserServiceClient(options: MockUserServiceOptions = {}): UserServiceClient {
  const allowedDomains = (options.allowedDomains ?? ['demo.com']).map(d => d.toLowerCase());
  const blockedEmails = new Set((options.blockedEmails ?? []).map(e => e.toLowerCase()));
  const defaultRoles = options.defaultRoles ?? ['user'];
  const defaultPermissions = options.defaultPermissions ?? [];

  function buildGrantedResult(request: UserValidationRequest): UserValidationResult {
    return {
      allowed: true,
      status: 'active',
      roles: [...defaultRoles],
      permissions: [...defaultPermissions],
      metadata: { tenantId: request.tenantId }
    };
  }

  const client: UserServiceClient & { __isMock?: boolean } = {
    async validateUser(request: UserValidationRequest): Promise<UserValidationResult> {
      const email = request.email?.toLowerCase();
      if (!email || !email.includes('@')) {
        return {
          allowed: false,
          status: 'invalid_email',
          roles: [],
          permissions: []
        };
      }
      if (blockedEmails.has(email)) {
        return {
          allowed: false,
          status: 'blocked',
          roles: [],
          permissions: []
        };
      }
      const domain = email.split('@')[1];
      if (allowedDomains.includes(domain)) {
        return buildGrantedResult(request);
      }
      return buildDeniedResult();
    }
  };

  // Add the __isMock property for testing purposes
  client.__isMock = true;

  return client;
}
