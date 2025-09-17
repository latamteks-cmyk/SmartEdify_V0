-- Añade columnas de trazabilidad para enlazar eventos outbox con spans HTTP.
ALTER TABLE IF EXISTS outbox_events
  ADD COLUMN IF NOT EXISTS trace_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS span_id TEXT NULL;

ALTER TABLE IF EXISTS outbox_events_dlq
  ADD COLUMN IF NOT EXISTS trace_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS span_id TEXT NULL;
