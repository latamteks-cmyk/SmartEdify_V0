import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';
import { JwksProvider } from '../../security/jwks-provider.js';

interface JwtClaims { sub: string; tenantId?: string; roles?: string[]; iat?: number; exp?: number }

declare module 'fastify' {
  interface FastifyRequest {
    auth?: { userId: string; roles: string[]; tenantId?: string };
  }
}

export interface AuthJwtOptions {
  publicKeyPem?: string; // Clave estática (fallback)
  required?: boolean;
  jwksProvider?: JwksProvider;
  allowedAlgs?: string[]; // default ['RS256','ES256','HS256']
}

export function authJwtPlugin(app: FastifyInstance, opts: AuthJwtOptions, done: (err?: Error) => void) {
  let staticKey: ReturnType<typeof createPublicKey> | string | null = null;
  if (opts.publicKeyPem) {
    try {
      staticKey = createPublicKey(opts.publicKeyPem);
    } catch (e) {
      app.log.warn('Clave pública JWT inválida (static)');
    }
  }
  const allowedAlgs = (opts.allowedAlgs || ['RS256','ES256','HS256']) as jwt.Algorithm[];

  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const authz = req.headers['authorization'];
    if (!authz) {
      if (opts.required) return reply.code(401).send({ error: 'unauthorized' });
      return; // opcional
    }
    const m = authz.match(/^Bearer (.+)$/i);
    if (!m) {
      return reply.code(400).send({ error: 'invalid_authorization_header' });
    }
    const token = m[1];
    try {
      // Parse token header para kid si se requiere JWKS
      const headerB64 = token.split('.')[0];
      const headerJson = JSON.parse(Buffer.from(headerB64, 'base64').toString('utf8')) as { alg?: string; kid?: string };
  if (headerJson.alg && !allowedAlgs.includes(headerJson.alg as jwt.Algorithm)) {
        return reply.code(401).send({ error: 'alg_not_allowed' });
      }
      let keyToUse: any = staticKey;
      if (!keyToUse && opts.jwksProvider && headerJson.kid) {
        keyToUse = await opts.jwksProvider.getPublicKey(headerJson.kid);
        if (!keyToUse) return reply.code(401).send({ error: 'unknown_kid' });
      }
      if (!keyToUse) {
        if (opts.required) return reply.code(503).send({ error: 'auth_unavailable' });
        return; // sin validación posible pero no requerida
      }
      const decoded = jwt.verify(token, keyToUse, { algorithms: allowedAlgs }) as JwtClaims;
      req.auth = { userId: decoded.sub, roles: decoded.roles || [], tenantId: decoded.tenantId };
    } catch (e) {
      return reply.code(401).send({ error: 'invalid_token' });
    }
  });
  done();
}
