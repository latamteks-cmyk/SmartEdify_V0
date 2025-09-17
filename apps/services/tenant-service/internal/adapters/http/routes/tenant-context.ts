import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { trace, SpanStatusCode } from '@opentelemetry/api';

// Esquema de validación de query
const ctxQuerySchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid()
});

// Función simple para derivar una versión numérica estable a partir del contenido
function computeVersion(payload: { roles: string[] }) {
  const base = payload.roles.sort().join('|');
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0; // unsigned
  }
  // Evitar 0
  return hash === 0 ? 1 : hash;
}

export async function tenantContextRoute(app: FastifyInstance) {
  app.get('/tenant-context', async (req: FastifyRequest<{ Querystring: any }>, reply) => {
    const parsed = ctxQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    }
    const { tenantId, userId } = parsed.data;

    const tracer = trace.getTracer('tenant-service');
    return tracer.startActiveSpan('tenant-context.resolve', async span => {
      span.setAttribute('tenant.id', tenantId);
      span.setAttribute('tenant.user.id', userId);

      try {
        const roles: string[] = [];
        try {
          const maybeAdmin = await app.di.governanceRepo.isAdmin?.(tenantId, userId);
          if (maybeAdmin) {
            span.addEvent('tenant-context.governance-admin');
            roles.push('admin');
          }
          if (app.di.rolesRepo) {
            const assigned = await app.di.rolesRepo.getUserRoles(tenantId, userId);
            if (assigned?.length) {
              span.addEvent('tenant-context.roles.assigned', { count: assigned.length });
              roles.push(...assigned);
            }
          }
        } catch (e: any) {
          span.recordException(e);
          span.setAttribute('tenant-context.roles.error', e?.message ?? 'unknown');
        }

        span.setAttribute('tenant.roles.count', roles.length);

        if (roles.length === 0) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'context_not_found' });
          return reply.code(404).send({ error: 'not_found' });
        }

        const version = computeVersion({ roles });
        span.setAttribute('tenant.roles.version', version);
        span.setStatus({ code: SpanStatusCode.OK });
        return reply.code(200).send({ userId, tenantId, roles, version });
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'tenant_context_error' });
        throw err;
      } finally {
        span.end();
      }
    });
  });
}
