export interface Tenant {
  id: string;
  name: string;
  code?: string | null;
  timezone: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface Unit {
  id: string;
  tenantId: string;
  code: string;
  type: string;
  parentUnitId?: string | null;
  areaM2?: number | null;
  active: boolean;
  createdAt: Date;
}

export type MembershipRelation = 'owner' | 'renter' | 'family';

export interface Membership {
  id: string;
  unitId: string;
  userId: string;
  relation: MembershipRelation;
  validFrom: Date;
  validTo?: Date | null;
  active: boolean;
  createdAt: Date;
}

export type GovernanceRole = 'admin' | 'presidente' | 'vicepresidente' | 'tesorero';

export interface GovernancePosition {
  id: string;
  tenantId: string;
  userId: string;
  role: GovernanceRole;
  delegatedFromUserId?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  chainHash?: string | null;
  createdAt: Date;
}
