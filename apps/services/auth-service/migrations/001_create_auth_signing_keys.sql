-- Migration: create auth_signing_keys table
-- Objective: Persist rotating asymmetric signing keys for JWT (current/next/retiring lifecycle)

CREATE TABLE IF NOT EXISTS auth_signing_keys (
    kid            VARCHAR(64) PRIMARY KEY,
    pem_private    TEXT        NOT NULL,
    pem_public     TEXT        NOT NULL,
    status         VARCHAR(16) NOT NULL CHECK (status IN ('current','next','retiring','expired')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    promoted_at    TIMESTAMPTZ NULL,
    retiring_at    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_signing_keys_status ON auth_signing_keys(status);

-- Optional view to quickly expose JWKS (public part only)
CREATE OR REPLACE VIEW v_jwks_public AS
SELECT kid,
       pem_public,
       status
FROM auth_signing_keys
WHERE status IN ('current','next','retiring');

-- Seed initial key record placeholder (application layer will upsert real key if absent)
-- INSERT INTO auth_signing_keys(kid, pem_private, pem_public, status) VALUES('INIT_PLACEHOLDER','', '', 'current');