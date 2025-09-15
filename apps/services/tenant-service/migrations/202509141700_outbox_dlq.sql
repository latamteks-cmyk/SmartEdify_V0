-- Migration: Outbox DLQ soporte de fallos permanentes
-- Requisitos: columnas avanzadas en outbox_events ya creadas.

CREATE TABLE IF NOT EXISTS outbox_events_dlq (
    id UUID PRIMARY KEY, -- mismo id que en outbox_events
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error TEXT NULL,
    retry_count INT NOT NULL,
    original_status TEXT NOT NULL, -- estado final previo al traslado (failed_permanent)
    moved_reason TEXT NOT NULL DEFAULT 'failed_permanent'
);

-- Índice por antigüedad para depuración/retención futura
CREATE INDEX IF NOT EXISTS idx_outbox_dlq_failed_at ON outbox_events_dlq(failed_at);
