-- Migration: Outbox avanzada (retries, estado, backoff) Fase 1
-- Requisitos: tabla outbox_events existente.

ALTER TABLE outbox_events
    ADD COLUMN status TEXT NOT NULL DEFAULT 'pending', -- pending|published|failed_permanent
    ADD COLUMN retry_count INT NOT NULL DEFAULT 0,
    ADD COLUMN last_error TEXT NULL,
    ADD COLUMN next_retry_at TIMESTAMPTZ NULL;

-- Índice para sacar lote elegible (pendientes y ya programados para ahora)
CREATE INDEX idx_outbox_pending_sched ON outbox_events((status)) WHERE status = 'pending';
CREATE INDEX idx_outbox_next_retry ON outbox_events(next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;

-- Published path sigue usando published_at. status=published se marca junto con published_at.

-- Nota: La lógica de selección deberá considerar (published_at IS NULL) AND status='pending' AND (next_retry_at IS NULL OR next_retry_at <= now()).