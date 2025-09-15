import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { outboxReprocessedTotal, outboxDlqPurgedTotal } from '../../../metrics/registry.js';

export async function outboxDlqRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/outbox/dlq', {
    schema: {
      querystring: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: 500 } },
        additionalProperties: false
      }
    }
  }, async (req, reply) => {
    const limit = (req.query as any).limit || 50;
    const rows = await app.di.outboxRepo.listDLQ(limit);
    reply.send({ items: rows, count: rows.length });
  });

  app.post('/outbox/dlq/:id/reprocess', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] }
    }
  }, async (req, reply) => {
    const { id } = req.params as any;
    const ok = await app.di.outboxRepo.reprocessFromDLQ(id);
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    outboxReprocessedTotal.inc();
    return reply.send({ status: 'reprocessed', id });
  });

  app.delete('/outbox/dlq', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          olderThan: { type: 'string', format: 'date-time' }
        },
        required: ['olderThan'],
        additionalProperties: false
      }
    }
  }, async (req, reply) => {
    const { olderThan } = req.query as any;
    let date: Date;
    try { date = new Date(olderThan); if (isNaN(date.getTime())) throw new Error('invalid'); } catch {
      return reply.code(400).send({ error: 'validation_error', field: 'olderThan' });
    }
    const deleted = await req.server.di.outboxRepo.purgeDLQOlderThan(date);
    if (deleted > 0) outboxDlqPurgedTotal.inc(deleted);
    return reply.send({ purged: deleted, olderThan: date.toISOString() });
  });
}
