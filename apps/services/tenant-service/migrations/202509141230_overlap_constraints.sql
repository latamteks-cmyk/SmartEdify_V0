-- Migration: Overlap constraint for unit_memberships (Fase 0 complemento)
-- Adds btree_gist extension, validity generated column and exclusion constraint to prevent overlapping active renter/owner memberships per unit.
-- Safe to run after 202509141200_init.sql

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE unit_memberships
    ADD COLUMN validity tstzrange GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED;

-- Exclude overlapping intervals for same unit where relation is renter/owner and active
ALTER TABLE unit_memberships
    ADD CONSTRAINT no_overlap_membership EXCLUDE USING gist (
        unit_id WITH =,
        validity WITH &&
    ) WHERE (relation IN ('renter','owner') AND active);

-- Nota: Si se requiere permitir coexistencia temporal con soft transition, se deberá manejar vía ends_at y valid_from no solapados.
