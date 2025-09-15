import { FastifyInstance } from 'fastify';
import { withConn } from '../../../adapters/repo/db.js';
import { brokerPublisherHealthGauge } from '../../../metrics/registry.js';

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_req, _rep) => {
    const checks: any = {};
    try {
      await withConn(c => c.query('SELECT 1'));
      checks.db = { ok: true };
    } catch (e: any) {
      checks.db = { ok: false, error: e?.message };
    }
    try {
      const pub: any = (app as any).publisher;
      if (pub?.health) {
        const h = await pub.health();
        checks.publisher = h;
        brokerPublisherHealthGauge.set(h.ok ? 1 : 0);
      } else {
        checks.publisher = { ok: true, skipped: true };
      }
    } catch (e: any) {
      checks.publisher = { ok: false, error: e?.message };
      brokerPublisherHealthGauge.set(0);
    }
    const overall = Object.values(checks).every((c: any) => c.ok !== false);
    return { status: overall ? 'ok' : 'degraded', checks };
  });
}
