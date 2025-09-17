import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { tenantCreatedTotal } from '../../../metrics/registry.js';
import { trace } from '@opentelemetry/api';

const createTenantSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  timezone: z.string().default('UTC')
});

type CreateTenantBody = ReturnType<typeof createTenantSchema.parse>;
interface GetTenantParams { id: string }

export async function tenantRoutes(app: FastifyInstance) {
  const repo = app.di.tenantRepo;
  app.post('/tenants', async (req: FastifyRequest<{ Body: unknown }>, reply) => {
    const parsed = createTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    }
    const body: CreateTenantBody = parsed.data;
    const t = await repo.create(body);
    tenantCreatedTotal.inc();
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute('tenant.id', t.id);
      if (t.code) {
        span.setAttribute('tenant.code', t.code);
      }
    }
    await app.di.outboxRepo.enqueue({
      aggregateType: 'tenant',
      aggregateId: t.id,
      type: 'tenant.created',
      payload: { id: t.id, name: t.name, code: t.code }
    });
    return reply.code(201).send({ id: t.id, name: t.name, code: t.code, timezone: t.timezone, status: t.status });
  });

  app.get('/tenants/:id', async (req: FastifyRequest<{ Params: GetTenantParams }>, reply) => {
    const { id } = req.params;
    const found = await repo.findById(id);
    if (!found) return reply.code(404).send({ error: 'not_found' });
    return { id: found.id, name: found.name, code: found.code, timezone: found.timezone, status: found.status };
  });
}
