import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { governanceTransferTotal } from '../../../metrics/registry.js';
import { getActiveTraceparent } from '../../../observability/trace-context.js';

const transferSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid()
});

interface GovernanceParams { tenantId: string }

export async function governanceRoutes(app: FastifyInstance) {
  app.post('/tenants/:tenantId/governance/transfer-admin', async (req: FastifyRequest<{ Params: GovernanceParams; Body: unknown }>, reply) => {
    const { tenantId } = req.params;
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    try {
      // Si ya existe un admin activo distinto y se intenta transferir a otro usuario, devolvemos 409 antes.
      const targetUser = parsed.data.toUserId;
      // Si target ya es admin devolvemos 200 idempotente.
      const isAlreadyAdmin = await app.di.governanceRepo.isAdmin(tenantId, targetUser).catch(() => false);
      if (isAlreadyAdmin) {
        // Métrica: no incrementamos 'success' para preservar semántica (transfer real). Idempotencia explícita.
        governanceTransferTotal.inc({ result: 'success' }); // tratamos idempotente como success sem mutación para métricas de ratio
        return reply.code(200).send({ tenantId, newAdminUserId: targetUser, status: 'already_admin' });
      }
      // Intentar crear admin; si unique conflict, lanzar controlado.
      await app.di.governanceRepo.createAdmin(tenantId, targetUser);
      governanceTransferTotal.inc({ result: 'success' });
      const traceparent = getActiveTraceparent();
      await app.di.outboxRepo.enqueue({
        aggregateType: 'tenant',
        aggregateId: tenantId,
        type: 'governance.changed',
        payload: {
          tenantId,
          action: 'transferred',
          toUserId: targetUser,
          ...(traceparent ? { traceparent } : {})
        }
      });
      return reply.code(200).send({ tenantId, newAdminUserId: targetUser, status: 'transferred' });
    } catch (e: any) {
      if (e instanceof Error && e.message === 'admin_conflict') {
        governanceTransferTotal.inc({ result: 'conflict' });
        return reply.code(409).send({ error: 'admin_conflict' });
      }
      throw e;
    }
  });

  app.post('/tenants/:tenantId/governance/delegate', async (req: FastifyRequest<{ Params: GovernanceParams }>, reply) => {
    return reply.code(501).send({ error: 'not_implemented', message: 'Delegation planned for Fase 3' });
  });
}
