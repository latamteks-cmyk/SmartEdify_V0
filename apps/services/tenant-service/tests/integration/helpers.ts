import { execSync } from 'node:child_process';
import { randomUUID } from 'crypto';
import { pool, withConn } from '../../internal/adapters/repo/db.js';
import { PgOutboxRepository } from '../../internal/adapters/repo/outbox-pg.js';
// Nota: poller + publisher no se inicializan en entorno test para control determinista de cambios en outbox.
import Fastify from 'fastify';
import { config } from '../../internal/config/env.js';
import { PgTenantRepository } from '../../internal/adapters/repo/tenant-pg.js';
import { PgUnitRepository } from '../../internal/adapters/repo/unit-pg.js';
import { PgMembershipRepository } from '../../internal/adapters/repo/membership-pg.js';
import { PgGovernanceRepository } from '../../internal/adapters/repo/governance-pg.js';
import { tenantContextRoute } from '../../internal/adapters/http/routes/tenant-context.js';
import { governanceRoutes } from '../../internal/adapters/http/routes/governance.js';
import { authJwtPlugin } from '../../internal/adapters/http/plugins/auth-jwt.js';
import { PgRolesRepository } from '../../internal/adapters/repo/roles-pg.js';
import { outboxDlqRoutes } from '../../internal/adapters/http/routes/outbox-dlq.js';
import { healthRoute } from '../../internal/adapters/http/routes/health.js';
import { metricsRoute } from '../../internal/adapters/http/routes/metrics.js';
import { LoggingPublisher } from '../../internal/adapters/publisher/publisher.js';

export async function resetDatabase() {
  // Limpieza mínimamente invasiva (solo tablas del servicio)
  const tables = ['outbox_events','governance_positions','role_assignments','role_definitions','unit_memberships','units','tenant_policies','tenants'];
  for (const t of tables) {
    await withConn(c => c.query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`));
  }
}

export async function buildTestApp() {
  const app = Fastify({ logger: false });
  const di = {
    tenantRepo: new PgTenantRepository(),
    unitRepo: new PgUnitRepository(),
    membershipRepo: new PgMembershipRepository(),
    governanceRepo: new PgGovernanceRepository(),
    outboxRepo: new PgOutboxRepository(),
    rolesRepo: new PgRolesRepository()
  } as const;
  app.decorate('di', di);
  // Decorar un publisher simple para health (sin poller en tests)
  (app as any).publisher = new LoggingPublisher(app.log);
  await app.register(authJwtPlugin, { publicKeyPem: '---INSECURE-NO-KEY---', required: false });
  await app.register(governanceRoutes);
  await app.register(tenantContextRoute);
  await app.register(outboxDlqRoutes);
  await app.register(metricsRoute);
  await app.register(healthRoute);
  return app;
}

export function fakeJwt(userId: string) {
  // Para pruebas sin validar firma real (plugin permite clave inválida en este modo)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId })).toString('base64url');
  return `${header}.${payload}.signature`;
}

export async function closeAll(app: any) {
  await app.close();
}
