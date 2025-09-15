/**
 * Crea la tabla auth_signing_keys (equivalente a la SQL en migrations/001_create_auth_signing_keys.sql)
 * Mantiene el ciclo de vida de claves rotativas (current, next, retiring, expired).
 * Usamos IF NOT EXISTS para idempotencia en entornos de prueba.
 * @param {import('node-pg-migrate').MigrationBuilder} pgm 
 */
exports.up = (pgm) => {
  pgm.sql(`CREATE TABLE IF NOT EXISTS auth_signing_keys (
    kid            VARCHAR(64) PRIMARY KEY,
    pem_private    TEXT        NOT NULL,
    pem_public     TEXT        NOT NULL,
    status         VARCHAR(16) NOT NULL CHECK (status IN ('current','next','retiring','expired')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    promoted_at    TIMESTAMPTZ NULL,
    retiring_at    TIMESTAMPTZ NULL
  );`);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_auth_signing_keys_status ON auth_signing_keys(status);`);

  pgm.sql(`CREATE OR REPLACE VIEW v_jwks_public AS
    SELECT kid, pem_public, status
    FROM auth_signing_keys
    WHERE status IN ('current','next','retiring');`);
};

exports.down = (pgm) => {
  pgm.sql('DROP VIEW IF EXISTS v_jwks_public;');
  pgm.sql('DROP TABLE IF EXISTS auth_signing_keys;');
};
