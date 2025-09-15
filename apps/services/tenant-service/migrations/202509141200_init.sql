-- Migration: Initial schema for Tenant Service (Fase 0)
-- Reversible: create core tables. (Drop statements omitted intentionally for production safety; add down migration separately if needed.)

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    timezone TEXT DEFAULT 'UTC',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_policies (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    unique_admin BOOLEAN NOT NULL DEFAULT TRUE,
    max_delegation_days INT NOT NULL DEFAULT 30,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    parent_unit_id UUID NULL REFERENCES units(id) ON DELETE SET NULL,
    area_m2 NUMERIC(12,2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);

CREATE TABLE unit_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    relation TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX idx_unit_memberships_unit ON unit_memberships(unit_id);
CREATE INDEX idx_unit_memberships_user ON unit_memberships(user_id);
CREATE INDEX idx_unit_memberships_active ON unit_memberships(active) WHERE active;

-- Governance positions (one active admin constraint via partial unique)
CREATE TABLE governance_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    delegated_from_user_id UUID NULL,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ NULL,
    chain_hash TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_governance_tenant_role ON governance_positions(tenant_id, role);
CREATE INDEX idx_governance_active ON governance_positions(tenant_id, role) WHERE ends_at IS NULL;

-- Enforce single active admin
CREATE UNIQUE INDEX uq_single_admin_active ON governance_positions(tenant_id) WHERE role = 'admin' AND ends_at IS NULL;

-- Outbox events for reliable publication
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_outbox_unpublished ON outbox_events(published_at) WHERE published_at IS NULL;

-- Optional: extension for future exclusion constraints (date range overlap)
-- CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Potential future constraint for membership overlap (requires storing tstzrange):
-- ALTER TABLE unit_memberships ADD COLUMN validity tstzrange GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED;
-- ALTER TABLE unit_memberships ADD CONSTRAINT no_overlap_membership EXCLUDE USING gist (unit_id WITH =, validity WITH &&) WHERE (relation IN ('renter','owner'));
