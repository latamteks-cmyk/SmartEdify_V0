# Runbook — Reprocesamiento DLQ

1. Identificar causa raíz en métricas y logs.
2. Corregir consumidor o datos.
3. Ejecutar *replay* acotado por `event_id` o rango de tiempo.
4. Validar idempotencia y consistencia.
