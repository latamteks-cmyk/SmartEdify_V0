import { randomUUID } from 'crypto';
import { Tenant, Unit, Membership, GovernancePosition } from '../../domain/models.js';

export interface TenantRepository {
  create(data: Pick<Tenant, 'name' | 'code' | 'timezone'>): Promise<Tenant>;
  findById(id: string): Promise<Tenant | null>;
}
export interface UnitRepository {
  create(data: Pick<Unit, 'tenantId' | 'code' | 'type' | 'parentUnitId' | 'areaM2'>): Promise<Unit>;
  listByTenant(tenantId: string): Promise<Unit[]>;
}
export interface MembershipRepository {
  create(data: Pick<Membership, 'unitId' | 'userId' | 'relation' | 'validFrom' | 'validTo'>): Promise<Membership>;
}
export interface GovernanceRepository {
  createAdmin(tenantId: string, userId: string): Promise<GovernancePosition>;
}

export class InMemoryTenantRepository implements TenantRepository {
  private items = new Map<string, Tenant>();
  async create(data: Pick<Tenant, 'name' | 'code' | 'timezone'>): Promise<Tenant> {
    const now = new Date();
    const tenant: Tenant = {
      id: randomUUID(),
      name: data.name,
      code: data.code,
      timezone: data.timezone || 'UTC',
      status: 'active',
      createdAt: now
    };
    this.items.set(tenant.id, tenant);
    return tenant;
  }
  async findById(id: string): Promise<Tenant | null> {
    return this.items.get(id) || null;
  }
}

export class InMemoryUnitRepository implements UnitRepository {
  private items: Unit[] = [];
  async create(data: Pick<Unit, 'tenantId' | 'code' | 'type' | 'parentUnitId' | 'areaM2'>): Promise<Unit> {
    const unit: Unit = {
      id: randomUUID(),
      tenantId: data.tenantId,
      code: data.code,
      type: data.type,
      parentUnitId: data.parentUnitId,
      areaM2: data.areaM2,
      active: true,
      createdAt: new Date()
    };
    this.items.push(unit);
    return unit;
  }
  async listByTenant(tenantId: string): Promise<Unit[]> {
    return this.items.filter(u => u.tenantId === tenantId);
  }
}

export class InMemoryMembershipRepository implements MembershipRepository {
  private items: Membership[] = [];
  async create(data: Pick<Membership, 'unitId' | 'userId' | 'relation' | 'validFrom' | 'validTo'>): Promise<Membership> {
    const m: Membership = {
      id: randomUUID(),
      unitId: data.unitId,
      userId: data.userId,
      relation: data.relation,
      validFrom: data.validFrom,
      validTo: data.validTo,
      active: true,
      createdAt: new Date()
    };
    this.items.push(m);
    return m;
  }
}

export class InMemoryGovernanceRepository implements GovernanceRepository {
  private items: GovernancePosition[] = [];
  async createAdmin(tenantId: string, userId: string): Promise<GovernancePosition> {
    const gp: GovernancePosition = {
      id: randomUUID(),
      tenantId,
      userId,
      role: 'admin',
      delegatedFromUserId: null,
      startsAt: new Date(),
      createdAt: new Date()
    } as GovernancePosition;
    this.items.push(gp);
    return gp;
  }
}
