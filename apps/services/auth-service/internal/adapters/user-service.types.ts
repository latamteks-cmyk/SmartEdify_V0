export interface UserValidationRequest {
  email: string;
  tenantId: string;
  name?: string;
}

export interface UserValidationResult {
  allowed: boolean;
  status: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, unknown>;
}

export interface UserServiceClient {
  validateUser(request: UserValidationRequest): Promise<UserValidationResult>;
}
