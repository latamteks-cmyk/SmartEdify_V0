-- Migration: Roles granulares (role_definitions & role_assignments)
-- Fase 1: Introduce definiciones de roles por tenant y asignaciones a usuarios

CREATE TABLE role_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);

CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_code TEXT NOT NULL,
    user_id UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_role_assign_def FOREIGN KEY (tenant_id, role_code) REFERENCES role_definitions(tenant_id, code) ON DELETE CASCADE
);

-- Evitar duplicados activos del mismo rol para el mismo usuario
CREATE UNIQUE INDEX uq_active_role_assignment ON role_assignments(tenant_id, role_code, user_id)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_role_assign_user ON role_assignments(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_role_assign_role ON role_assignments(tenant_id, role_code) WHERE revoked_at IS NULL;

-- Nota: futuras extensiones podrían añadir tabla permissions y tabla role_permissions.