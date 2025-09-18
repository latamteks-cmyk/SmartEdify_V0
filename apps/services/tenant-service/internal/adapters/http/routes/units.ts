import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { unitCreatedTotal } from '../../../metrics/registry.js';
import { withSpan } from '@smartedify/shared/tracing';
import { getActiveTraceparent } from '../../../observability/trace-context.js';

const createUnitSchema = z.object({
  code: z.string().min(1),
  type: z.string().min(1),
  parentUnitId: z.string().uuid().optional(),
  areaM2: z.number().positive().optional()
});

const TENANT_TRACER = process.env.TENANT_SERVICE_NAME || 'tenant-service';

export async function unitRoutes(app: FastifyInstance) {
  const unitRepo = app.di.unitRepo;
  app.post('/tenants/:tenantId/units', async (req, reply) => {
    // @ts-ignore simplifying
    const { tenantId } = req.params;
    return withSpan(TENANT_TRACER, 'tenant.unit.create', { 'tenant.id': tenantId }, async span => {
      const bodyParse = createUnitSchema.safeParse(req.body);
      if (!bodyParse.success) {
        span.setAttribute('unit.result', 'validation_error');
        return reply.status(400).send({ error: 'validation_error', details: bodyParse.error.flatten() });
      }
      const unit = await unitRepo.create({
        tenantId,
        code: bodyParse.data.code,
        type: bodyParse.data.type,
        parentUnitId: bodyParse.data.parentUnitId,
        areaM2: bodyParse.data.areaM2
      });
      unitCreatedTotal.inc();
      span.setAttribute('unit.id', unit.id);
      span.setAttribute('unit.code', unit.code);
      span.setAttribute('unit.result', 'success');
      span.addEvent('tenant.unit.created', { 'unit.id': unit.id, 'tenant.id': tenantId });
      const traceparent = getActiveTraceparent();
      const payload: Record<string, unknown> = {
        id: unit.id,
        tenantId: unit.tenantId,
        code: unit.code,
        type: unit.type
      };
      if (traceparent) {
        payload.traceparent = traceparent;
      }
      await app.di.outboxRepo.enqueue({
        aggregateType: 'unit',
        aggregateId: unit.id,
        type: 'unit.created',
        payload
      });
      return reply.code(201).send({ id: unit.id, code: unit.code, type: unit.type, active: unit.active });
    });
  });

  app.get('/tenants/:tenantId/units', async (req) => {
    // @ts-ignore simplifying
    const { tenantId } = req.params;
    const list = await unitRepo.listByTenant(tenantId);
    return list.map(u => ({ id: u.id, code: u.code, type: u.type, active: u.active }));
  });
}
