import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getCurrentKey, getKeyByKid } from './keys';
import { addToRevocationList, saveRefreshToken, getRefreshToken, revokeRefreshToken, markRefreshRotated, isRefreshRotated } from '../adapters/redis/redis.adapter';

// In-memory rotated set (MVP). En producción debería sustentarse en Redis para múltiples réplicas.
const rotatedRefreshJtis = new Set<string>();

// Estas variables legacy se mantendrán como fallback si no existe aún key store (no debería suceder tras migración)
const ACCESS_SECRET = process.env.AUTH_JWT_ACCESS_SECRET || '';
const REFRESH_SECRET = process.env.AUTH_JWT_REFRESH_SECRET || '';
const ACCESS_TTL = process.env.AUTH_JWT_ACCESS_TTL || '900s'; // 15m

// Parse robusto para TTL de refresh: soporta números puros (segundos) o sufijos s/m/h/d (ej: 30d).
function parseDurationSeconds(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/^(\d+)([smhd])$/);
  if (!m) return fallback;
  const value = Number(m[1]);
  switch (m[2]) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return fallback;
  }
}
const REFRESH_TTL_SECONDS = parseDurationSeconds(process.env.AUTH_JWT_REFRESH_TTL, 60 * 60 * 24 * 30); // 30d por defecto

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos access
}

export async function signAccessToken(payload: Record<string, any>): Promise<{ token: string; jti: string; expSeconds: number; kid: string }> {
  const jti = randomUUID();
  const expSeconds = parseHumanSeconds(ACCESS_TTL);
  const key = await getCurrentKey();
  const accessPayload: jwt.JwtPayload = { ...payload, jti, type: 'access' };
  const token = jwt.sign(accessPayload, key.pem_private, { expiresIn: ACCESS_TTL, algorithm: 'RS256', keyid: key.kid } as jwt.SignOptions);
  return { token, jti, expSeconds, kid: key.kid };
}

export async function signRefreshToken(payload: Record<string, any>): Promise<{ token: string; jti: string; expSeconds: number; kid: string }> {
  const jti = randomUUID();
  const expSeconds = REFRESH_TTL_SECONDS;
  const key = await getCurrentKey();
  const refreshPayload: jwt.JwtPayload = { ...payload, jti, type: 'refresh' };
  const token = jwt.sign(refreshPayload, key.pem_private, { expiresIn: expSeconds, algorithm: 'RS256', keyid: key.kid } as jwt.SignOptions);
  return { token, jti, expSeconds, kid: key.kid };
}

export async function issueTokenPair(base: { sub: string; tenant_id: string; roles?: string[] }): Promise<TokenPair> {
  const access = await signAccessToken(base);
  const refresh = await signRefreshToken(base);
  await saveRefreshToken(refresh.jti, { sub: base.sub, tenant_id: base.tenant_id, roles: base.roles }, refresh.expSeconds);
  return { accessToken: access.token, refreshToken: refresh.token, expiresIn: access.expSeconds };
}

export async function verifyAccess(token: string) {
  const decodedHeader: any = jwt.decode(token, { complete: true });
  const kid = decodedHeader?.header?.kid;
  if (!kid) {
    if (ACCESS_SECRET) return jwt.verify(token, ACCESS_SECRET as jwt.Secret);
    throw new Error('kid ausente en token');
  }
  const key = await getKeyByKid(kid);
  if (!key) throw new Error('Clave no encontrada para kid');
  return jwt.verify(token, key.pem_public, { algorithms: ['RS256'] });
}
export async function verifyRefresh(token: string) {
  const decodedHeader: any = jwt.decode(token, { complete: true });
  const kid = decodedHeader?.header?.kid;
  if (!kid) {
    if (REFRESH_SECRET) return jwt.verify(token, REFRESH_SECRET as jwt.Secret);
    throw new Error('kid ausente en token');
  }
  const key = await getKeyByKid(kid);
  if (!key) throw new Error('Clave no encontrada para kid');
  return jwt.verify(token, key.pem_public, { algorithms: ['RS256'] });
}

export async function rotateRefresh(oldRefreshToken: string): Promise<TokenPair | null> {
  try {
  const decoded: any = await verifyRefresh(oldRefreshToken);
    if (decoded.type !== 'refresh') return null;
    const debug = !!process.env.DEBUG_REFRESH || process.env.NODE_ENV === 'test';
    if (debug) console.log('[rotateRefresh] decoded jti', decoded.jti, 'type', decoded.type);
    if (rotatedRefreshJtis.has(decoded.jti)) {
      if (debug) console.log('[rotateRefresh] reuse detected (in-memory)', decoded.jti);
      return null;
    }
    if (await isRefreshRotated(decoded.jti)) {
      if (debug) console.log('[rotateRefresh] reuse detected (redis)', decoded.jti);
      return null;
    }
    const stored = await getRefreshToken(decoded.jti);
    if (!stored) {
      if (debug) console.log('[rotateRefresh] stored not found for jti', decoded.jti);
      return null;
    }
    await revokeRefreshToken(decoded.jti);
    rotatedRefreshJtis.add(decoded.jti);
    setTimeout(() => rotatedRefreshJtis.delete(decoded.jti), 60 * 60 * 1000);
    await addToRevocationList(decoded.jti, 'refresh', 'rotated', Math.min(3600, REFRESH_TTL_SECONDS));
    await markRefreshRotated(decoded.jti, Math.min(3600, REFRESH_TTL_SECONDS));
  return issueTokenPair({ sub: decoded.sub, tenant_id: decoded.tenant_id, roles: decoded.roles });
  } catch (e) {
    if (process.env.NODE_ENV === 'test' || process.env.DEBUG_REFRESH) console.log('[rotateRefresh] error verifying refresh', (e as any)?.message);
    return null;
  }
}

function parseHumanSeconds(input: string): number {
  if (/^\d+$/.test(input)) return Number(input);
  const match = input.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = Number(match[1]);
  switch (match[2]) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}
