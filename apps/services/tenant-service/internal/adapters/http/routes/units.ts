import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { unitCreatedTotal } from '../../../metrics/registry.js';

const createUnitSchema = z.object({
  code: z.string().min(1),
  type: z.string().min(1),
  parentUnitId: z.string().uuid().optional(),
  areaM2: z.number().positive().optional()
});

export async function unitRoutes(app: FastifyInstance) {
  const unitRepo = app.di.unitRepo;
  app.post('/tenants/:tenantId/units', async (req, reply) => {
    // @ts-ignore simplifying
    const { tenantId } = req.params;
    const bodyParse = createUnitSchema.safeParse(req.body);
    if (!bodyParse.success) return reply.status(400).send({ error: 'validation_error', details: bodyParse.error.flatten() });
    const unit = await unitRepo.create({ tenantId, code: bodyParse.data.code, type: bodyParse.data.type, parentUnitId: bodyParse.data.parentUnitId, areaM2: bodyParse.data.areaM2 });
    unitCreatedTotal.inc();
    await app.di.outboxRepo.enqueue({
      aggregateType: 'unit',
      aggregateId: unit.id,
      type: 'unit.created',
      payload: { id: unit.id, tenantId: unit.tenantId, code: unit.code, type: unit.type }
    });
    return reply.code(201).send({ id: unit.id, code: unit.code, type: unit.type, active: unit.active });
  });

  app.get('/tenants/:tenantId/units', async (req) => {
    // @ts-ignore simplifying
    const { tenantId } = req.params;
    const list = await unitRepo.listByTenant(tenantId);
    return list.map(u => ({ id: u.id, code: u.code, type: u.type, active: u.active }));
  });
}
