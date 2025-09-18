export type JwkKeyType = 'RSA' | 'EC' | 'OKP';
export type JwkUse = 'sig' | 'enc';

export interface JsonWebKey {
  readonly kid: string;
  readonly kty: JwkKeyType;
  readonly use: JwkUse;
  readonly alg: string;
  readonly n?: string; // RSA modulus
  readonly e?: string; // RSA exponent
  readonly crv?: string; // EC / OKP curve
  readonly x?: string;
  readonly y?: string;
  readonly d?: string;
}

export interface JsonWebKeySet {
  readonly keys: readonly JsonWebKey[];
}

export function createJwks(keys: readonly JsonWebKey[]): JsonWebKeySet {
  return { keys: [...keys] };
}

export function findSigningKey(jwks: JsonWebKeySet, kid: string): JsonWebKey | undefined {
  return jwks.keys.find((key) => key.kid === kid && key.use === 'sig');
}

export function assertSigningKey(jwks: JsonWebKeySet, kid: string): JsonWebKey {
  const key = findSigningKey(jwks, kid);
  if (!key) {
    throw new Error(`Signing key with kid=${kid} not found in JWKS.`);
  }
  return key;
}
