import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { membershipActiveGauge } from '../../../metrics/registry.js';

const createMembershipSchema = z.object({
  userId: z.string().uuid(),
  relation: z.enum(['owner','renter','family']),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().optional()
});

export async function membershipRoutes(app: FastifyInstance) {
  const membershipRepo = app.di.membershipRepo;
  app.post('/units/:unitId/memberships', async (req, reply) => {
    // @ts-ignore simplifying
    const { unitId } = req.params;
    const parsed = createMembershipSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    const m = await membershipRepo.create({
      unitId,
      userId: parsed.data.userId,
      relation: parsed.data.relation,
      validFrom: new Date(parsed.data.validFrom),
      validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : undefined
    });
    const active = await membershipRepo.countActive();
    membershipActiveGauge.set(active);
    await app.di.outboxRepo.enqueue({
      aggregateType: 'membership',
      aggregateId: m.id,
      type: 'membership.added',
      payload: { id: m.id, unitId: m.unitId, userId: m.userId, relation: m.relation }
    });
    return reply.code(201).send({ id: m.id, unitId: m.unitId, relation: m.relation });
  });
}
