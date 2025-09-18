import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { membershipActiveGauge } from '../../../metrics/registry.js';
import { withSpan } from '@smartedify/shared/tracing';
import { getActiveTraceparent } from '../../../observability/trace-context.js';

const createMembershipSchema = z.object({
  userId: z.string().uuid(),
  relation: z.enum(['owner','renter','family']),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().optional()
});

const TENANT_TRACER = process.env.TENANT_SERVICE_NAME || 'tenant-service';

export async function membershipRoutes(app: FastifyInstance) {
  const membershipRepo = app.di.membershipRepo;
  app.post('/units/:unitId/memberships', async (req, reply) => {
    // @ts-ignore simplifying
    const { unitId } = req.params;
    return withSpan(TENANT_TRACER, 'tenant.membership.create', { 'unit.id': unitId }, async span => {
      const parsed = createMembershipSchema.safeParse(req.body);
      if (!parsed.success) {
        span.setAttribute('membership.result', 'validation_error');
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }
      const m = await membershipRepo.create({
        unitId,
        userId: parsed.data.userId,
        relation: parsed.data.relation,
        validFrom: new Date(parsed.data.validFrom),
        validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : undefined
      });
      const active = await membershipRepo.countActive();
      membershipActiveGauge.set(active);
      span.setAttribute('membership.id', m.id);
      span.setAttribute('membership.user_id', m.userId);
      span.setAttribute('membership.result', 'success');
      span.addEvent('tenant.membership.created', { 'membership.id': m.id, 'unit.id': m.unitId });
      const traceparent = getActiveTraceparent();
      const payload: Record<string, unknown> = {
        id: m.id,
        unitId: m.unitId,
        userId: m.userId,
        relation: m.relation
      };
      if (traceparent) {
        payload.traceparent = traceparent;
      }
      await app.di.outboxRepo.enqueue({
        aggregateType: 'membership',
        aggregateId: m.id,
        type: 'membership.added',
        payload
      });
      return reply.code(201).send({ id: m.id, unitId: m.unitId, relation: m.relation });
    });
  });
}
