-- Migración inicial Auth Service
-- Timestamp: $(date) - registrar manualmente si se requiere

BEGIN;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  pwd_hash TEXT NOT NULL,
  pwd_salt TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id, role)
);

CREATE TABLE IF NOT EXISTS audit_security (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  event TEXT NOT NULL,
  ip TEXT NOT NULL,
  ua TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_security_ts ON audit_security(ts);

COMMIT;
