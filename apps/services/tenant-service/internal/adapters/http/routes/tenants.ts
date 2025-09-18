import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { tenantCreatedTotal } from '../../../metrics/registry.js';
import { withSpan } from '@smartedify/shared/tracing';
import { getActiveTraceparent } from '../../../observability/trace-context.js';

const createTenantSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  timezone: z.string().default('UTC')
});

type CreateTenantBody = ReturnType<typeof createTenantSchema.parse>;
interface GetTenantParams { id: string }

const TENANT_TRACER = process.env.TENANT_SERVICE_NAME || 'tenant-service';

export async function tenantRoutes(app: FastifyInstance) {
  const repo = app.di.tenantRepo;
  app.post('/tenants', async (req: FastifyRequest<{ Body: unknown }>, reply) => {
    return withSpan(TENANT_TRACER, 'tenant.create', undefined, async span => {
      const parsed = createTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        span.setAttribute('tenant.result', 'validation_error');
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }
      const body: CreateTenantBody = parsed.data;
      const t = await repo.create(body);
      tenantCreatedTotal.inc();
      span.setAttribute('tenant.id', t.id);
      if (t.code) {
        span.setAttribute('tenant.code', t.code);
      }
      span.setAttribute('tenant.result', 'success');
      span.addEvent('tenant.created', { 'tenant.id': t.id });
      const traceparent = getActiveTraceparent();
      const payload: Record<string, unknown> = { id: t.id, name: t.name, code: t.code };
      if (traceparent) {
        payload.traceparent = traceparent;
      }
      await app.di.outboxRepo.enqueue({
        aggregateType: 'tenant',
        aggregateId: t.id,
        type: 'tenant.created',
        payload
      });
      return reply.code(201).send({ id: t.id, name: t.name, code: t.code, timezone: t.timezone, status: t.status });
    });
  });

  app.get('/tenants/:id', async (req: FastifyRequest<{ Params: GetTenantParams }>, reply) => {
    const { id } = req.params;
    const found = await repo.findById(id);
    if (!found) return reply.code(404).send({ error: 'not_found' });
    return { id: found.id, name: found.name, code: found.code, timezone: found.timezone, status: found.status };
  });
}
