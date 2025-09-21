import { createHash } from 'crypto';

function base64UrlEncode(str: Buffer): string {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function verifyAndValidatePkce(verifier: string, challenge: string): Promise<boolean> {
  try {
    const hashedVerifier = base64UrlEncode(createHash('sha256').update(verifier).digest());
    return hashedVerifier === challenge;
  } catch (e) {
    return false;
  }
}
