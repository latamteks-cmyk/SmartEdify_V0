import 'fastify';
import { PgTenantRepository } from '../internal/adapters/repo/tenant-pg.js';
import { PgUnitRepository } from '../internal/adapters/repo/unit-pg.js';
import { PgMembershipRepository } from '../internal/adapters/repo/membership-pg.js';
import { PgGovernanceRepository } from '../internal/adapters/repo/governance-pg.js';
import { PgOutboxRepository } from '../internal/adapters/repo/outbox-pg.js';
import { PgRolesRepository } from '../internal/adapters/repo/roles-pg.js';

declare module 'fastify' {
  interface FastifyInstance {
    di: {
      tenantRepo: PgTenantRepository;
      unitRepo: PgUnitRepository;
      membershipRepo: PgMembershipRepository;
      governanceRepo: PgGovernanceRepository;
  rolesRepo: PgRolesRepository;
      outboxRepo: PgOutboxRepository;
    }
  }
}

export {};