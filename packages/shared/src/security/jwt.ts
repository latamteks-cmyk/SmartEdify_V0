export interface JwtRegisteredClaims {
  readonly iss: string;
  readonly sub: string;
  readonly aud: string | readonly string[];
  readonly exp: number;
  readonly iat: number;
  readonly nbf?: number;
  readonly jti?: string;
  readonly scope?: string;
}

export type JwtPayload<TCustom extends Record<string, unknown> = Record<string, unknown>> = JwtRegisteredClaims & TCustom;

export interface JwtValidationOptions {
  readonly expectedIssuer?: string;
  readonly expectedAudience?: string | readonly string[];
  readonly clockToleranceSeconds?: number;
  readonly now?: Date;
}

export interface JwtValidationResult<T extends JwtPayload> {
  readonly payload: T;
  readonly isExpired: boolean;
}

export function validateJwtPayload<T extends JwtPayload>(
  payload: T,
  { expectedIssuer, expectedAudience, clockToleranceSeconds = 0, now = new Date() }: JwtValidationOptions = {}
): JwtValidationResult<T> {
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    throw new Error(`Unexpected issuer. Expected ${expectedIssuer} and received ${payload.iss}`);
  }

  if (expectedAudience && !audienceMatches(payload.aud, expectedAudience)) {
    throw new Error('Unexpected audience.');
  }

  const currentEpochSeconds = Math.floor(now.getTime() / 1000);
  const tolerance = clockToleranceSeconds;
  const isExpired = payload.exp + tolerance <= currentEpochSeconds;

  if (payload.nbf && payload.nbf - tolerance > currentEpochSeconds) {
    throw new Error('Token cannot be used yet (nbf validation failed).');
  }

  return { payload, isExpired };
}

export function audienceMatches(actual: string | readonly string[], expected: string | readonly string[]): boolean {
  const actualAudiences = Array.isArray(actual) ? actual : [actual];
  const expectedAudiences = Array.isArray(expected) ? expected : [expected];
  return expectedAudiences.every((aud) => actualAudiences.includes(aud));
}

export function createJwtPayload<TCustom extends Record<string, unknown>>(
  registered: JwtRegisteredClaims,
  custom: TCustom
): JwtPayload<TCustom> {
  return {
    ...registered,
    ...custom
  };
}
