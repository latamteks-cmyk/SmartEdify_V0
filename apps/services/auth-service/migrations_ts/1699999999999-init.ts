import { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
  pgm.sql(`CREATE TABLE IF NOT EXISTS users (
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
  );`);
  pgm.sql(`CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    role TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tenant_id, role)
  );`);
  pgm.sql(`CREATE TABLE IF NOT EXISTS audit_security (
    id BIGSERIAL PRIMARY KEY,
    actor TEXT NOT NULL,
    event TEXT NOT NULL,
    ip TEXT NOT NULL,
    ua TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ts TIMESTAMPTZ NOT NULL DEFAULT now()
  );`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_audit_security_ts ON audit_security(ts);`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS audit_security;');
  pgm.sql('DROP TABLE IF EXISTS user_roles;');
  pgm.sql('DROP TABLE IF EXISTS users;');
}
