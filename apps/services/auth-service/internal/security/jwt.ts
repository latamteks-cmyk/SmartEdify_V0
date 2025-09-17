import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getCurrentKey, getKeyByKid } from './keys';
import {
  addToRevocationList,
  addAccessTokenToDenyList,
  saveRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
  markRefreshRotated,
  isRefreshRotated,
  isRevoked,
  isAccessTokenDenied,
  markKidRevoked,
  isKidRevoked,
  getRefreshTokensByKid,
  getRefreshTokenTtl,
  deleteSession
} from '../adapters/redis/redis.adapter';
import { getIssuer } from '../config/issuer';

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

function normalizeScope(scope?: string | string[]): string | undefined {
  if (!scope) return undefined;
  const list = Array.isArray(scope) ? scope : scope.split(/\s+/);
  const filtered = list.map(s => s.trim()).filter(Boolean);
  if (!filtered.length) return undefined;
  return Array.from(new Set(filtered)).join(' ');
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos access
  scope?: string;
  client_id?: string;
  roles?: string[];
  sub?: string;
  tenant_id?: string;
  accessKid?: string;
  refreshKid?: string;
  accessJti?: string;
  refreshJti?: string;
}

export interface TokenIssueParams {
  sub: string;
  tenant_id: string;
  roles?: string[];
  scope?: string | string[];
  client_id?: string;
  auth_time?: number;
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

export async function issueTokenPair(base: TokenIssueParams): Promise<TokenPair> {
  const scopeString = normalizeScope(base.scope);
  const payload: Record<string, any> = {
    sub: base.sub,
    tenant_id: base.tenant_id,
    iss: getIssuer()
  };
  if (base.roles && base.roles.length) payload.roles = base.roles;
  if (scopeString) payload.scope = scopeString;
  if (base.client_id) {
    payload.client_id = base.client_id;
    payload.aud = base.client_id;
  }
  if (typeof base.auth_time === 'number') payload.auth_time = base.auth_time;
  const access = await signAccessToken(payload);
  const refreshPayload = { ...payload };
  const refresh = await signRefreshToken(refreshPayload);
  await saveRefreshToken(refresh.jti, {
    sub: base.sub,
    tenant_id: base.tenant_id,
    roles: base.roles,
    scope: scopeString,
    client_id: base.client_id,
    kid: refresh.kid
  }, refresh.expSeconds);
  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    expiresIn: access.expSeconds,
    scope: scopeString,
    client_id: base.client_id,
    roles: base.roles,
    sub: base.sub,
    tenant_id: base.tenant_id,
    accessKid: access.kid,
    refreshKid: refresh.kid,
    accessJti: access.jti,
    refreshJti: refresh.jti
  };
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
  const verified = jwt.verify(token, key.pem_public, { algorithms: ['RS256'] }) as jwt.JwtPayload;
  if (verified && typeof verified === 'object' && verified.jti) {
    if (await isRevoked(verified.jti)) throw new Error('token_revocado');
    if (await isAccessTokenDenied(verified.jti)) throw new Error('token_deny_list');
  }
  if (await isKidRevoked(kid)) throw new Error('kid_revocado');
  return verified;
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
  const verified = jwt.verify(token, key.pem_public, { algorithms: ['RS256'] }) as jwt.JwtPayload;
  if (verified && typeof verified === 'object' && verified.jti) {
    if (await isRevoked(verified.jti)) throw new Error('token_revocado');
  }
  if (await isKidRevoked(kid)) throw new Error('kid_revocado');
  return verified;
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
  return issueTokenPair({
      sub: decoded.sub,
      tenant_id: decoded.tenant_id,
      roles: decoded.roles,
      scope: decoded.scope,
      client_id: decoded.client_id,
      auth_time: typeof decoded.auth_time === 'number' ? decoded.auth_time : undefined
    });
  } catch (e) {
    if (process.env.NODE_ENV === 'test' || process.env.DEBUG_REFRESH) console.log('[rotateRefresh] error verifying refresh', (e as any)?.message);
    return null;
  }
}

export async function revokeSessionsByKid(kid: string, reason: string = 'kid_revocado'): Promise<{ kid: string; revoked: number }> {
  const normalizedKid = typeof kid === 'string' ? kid.trim() : '';
  if (!normalizedKid) return { kid: normalizedKid, revoked: 0 };
  await markKidRevoked(normalizedKid, REFRESH_TTL_SECONDS);
  const tokens = await getRefreshTokensByKid(normalizedKid);
  const uniqueTokens = Array.from(new Set(tokens));
  let revoked = 0;
  for (const tokenId of uniqueTokens) {
    const ttl = await getRefreshTokenTtl(tokenId);
    const ttlSeconds = ttl > 0 ? ttl : REFRESH_TTL_SECONDS;
    try {
      await addToRevocationList(tokenId, 'refresh', reason, ttlSeconds);
    } catch {}
    try {
      await markRefreshRotated(tokenId, ttlSeconds);
    } catch {}
    try {
      await revokeRefreshToken(tokenId);
    } catch {}
    try {
      await deleteSession(tokenId);
    } catch {}
    revoked += 1;
  }
  return { kid: normalizedKid, revoked };
}

export async function signIdToken(params: {
  sub: string;
  tenant_id: string;
  client_id: string;
  scope?: string | string[];
  roles?: string[];
  auth_time?: number;
  extra?: Record<string, any>;
}): Promise<{ token: string; exp: number; kid: string }> {
  const key = await getCurrentKey();
  const scopeString = normalizeScope(params.scope);
  const now = Math.floor(Date.now() / 1000);
  const expSeconds = parseHumanSeconds(ACCESS_TTL);
  const payload: jwt.JwtPayload = {
    iss: getIssuer(),
    aud: params.client_id,
    sub: params.sub,
    tenant_id: params.tenant_id,
    iat: now,
    exp: now + expSeconds,
    auth_time: typeof params.auth_time === 'number' ? params.auth_time : now
  };
  if (params.roles && params.roles.length) payload.roles = params.roles;
  if (scopeString) payload.scope = scopeString;
  if (params.extra) {
    for (const [key, value] of Object.entries(params.extra)) {
      if (value !== undefined && value !== null) {
        (payload as any)[key] = value;
      }
    }
  }
  const token = jwt.sign(payload, key.pem_private, {
    algorithm: 'RS256',
    keyid: key.kid
  } as jwt.SignOptions);
  return { token, exp: payload.exp as number, kid: key.kid };
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
