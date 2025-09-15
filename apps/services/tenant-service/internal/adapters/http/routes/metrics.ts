import { FastifyInstance } from 'fastify';
import { registry } from '../../../metrics/registry.js';

export async function metricsRoute(app: FastifyInstance) {
  app.get('/metrics', async (_req, reply) => {
    const data = await registry.metrics();
    reply.header('Content-Type', registry.contentType);
    reply.send(data);
  });
}
