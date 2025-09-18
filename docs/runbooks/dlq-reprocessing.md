# Runbook — Reprocesamiento DLQ

> **Referencias:**
> - ADR: [ADR-0005-consumer-processing.md](../design/adr/ADR-0005-consumer-processing.md)
> - Diagrama: [consumer-retry-sequence.mmd](../design/diagrams/consumer-retry-sequence.mmd)

## Purpose
Restablecer el flujo de eventos movidos a la *dead letter queue* (DLQ) del Tenant Service cuando se detecta acumulación anómala o fallos permanentes. El objetivo es reprocesar sólo los eventos seguros, mantener el tamaño de la cola bajo control y recuperar la consistencia en los consumidores downstream.

## Preconditions
- Existe una alerta (`outbox_dlq_size > 0` o crecimiento acelerado) o un ticket operativo asignado.
- Acceso a la base de datos del Tenant Service y permisos para invocar los endpoints `GET/POST/DELETE /outbox/dlq`.
- Captura inicial del panel *Eventos DLQ por tipo* del dashboard [`Tenant Service · Outbox & Consumers`](../observability/dashboards/tenant-service.json) filtrado por `environment` correspondiente. Adjuntar screenshot en el ticket.
- Snapshot inicial de la DLQ antes de cualquier acción.
- Coordinación con el equipo de dominio afectado para validar que la causa raíz está mitigada.

## Step-by-step
1. **Tomar fotografía inicial y confirmar impacto.**
   ```bash
   export TENANT_API="https://tenant-service.prod.smartedify.internal"
   curl -s "$TENANT_API/metrics" | grep -E 'outbox_dlq_size|outbox_event_age_seconds'
   curl -s "$TENANT_API/outbox/dlq?limit=500" | jq '.' > dlq-snapshot.json
   ```
   - Métricas a observar: `outbox_dlq_size`, `outbox_event_age_seconds_bucket` (p95) y `outbox_reprocessed_total`.
   - Adjunta en el ticket la captura previa del panel *Eventos DLQ por tipo (última hora)* filtrando por el mismo `environment`.

2. **Agrupar eventos y detectar patrón.**
   ```sql
   \c tenant_service
   SELECT type, count(*) AS total, max(last_error) AS sample_error
   FROM outbox_events_dlq
   GROUP BY type
   ORDER BY total DESC;
   ```
   Revisa en logs del consumidor correspondiente (`kubectl logs deploy/tenant-consumer -n tenants -f`).

3. **Validar que la causa raíz está resuelta.** Documenta el fix (configuración, despliegue, datos corregidos). Sin mitigación previa, NO reintentar.

4. **Definir lote a reprocesar y crear respaldo.**
   ```bash
   jq -r '.items[] | [.id, .type, .failed_at] | @tsv' dlq-snapshot.json > dlq-backup.tsv
   ```
   Opcional: genera tabla temporal en DB para rollback.

5. **Reprocesar eventos seleccionados.**
   - Reproceso individual (útil para validar fix):
     ```bash
     EVENT_ID="<uuid>"
     curl -s -X POST "$TENANT_API/outbox/dlq/$EVENT_ID/reprocess"
     ```
   - Reproceso masivo acotado por filtro `type` o lista de IDs:
     ```bash
     jq -r '.items[] | select(.type=="tenant.created") | .id' dlq-snapshot.json \
       | while read id; do
           curl -s -X POST "$TENANT_API/outbox/dlq/$id/reprocess";
         done
     ```
   Observa que `outbox_reprocessed_total` debe incrementarse conforme se vacía la cola.

6. **Purgar residuales antiguos (si procede).**
   ```bash
   OLDER_THAN=$(date -u -d '14 days ago' +%FT%TZ)
   curl -s -X DELETE "$TENANT_API/outbox/dlq?olderThan=$OLDER_THAN"
   ```
   Esta acción incrementa `outbox_dlq_purged_total` y mantiene la cola limpia tras validar que no quedan eventos reprocesables.

## Validation
- `curl -s "$TENANT_API/metrics" | grep outbox_dlq_size` → debe tender a `0` o al umbral acordado (< 10 eventos).
- `curl -s "$TENANT_API/metrics" | grep outbox_reprocessed_total` → el contador debe haber incrementado igual al número de eventos reintentados exitosamente.
- Consulta SQL final:
  ```sql
  SELECT count(*) FROM outbox_events_dlq;
  ```
  Asegura que sólo queden eventos con causa raíz abierta o aprobados para retenerse.
- Revisa dashboards de consumidor downstream para confirmar que no hay nuevos errores asociados al lote reprocesado (por ejemplo, panel *Lag consumidor* en `Tenant Service · Outbox & Consumers` mostrando `broker_consumer_lag_max` estable).
- **Recuperación exitosa:** No deben generarse nuevas alertas de DLQ ni errores de reprocesamiento en los dashboards de monitoreo durante al menos 30 minutos tras la intervención.

## Rollback
1. Si los reprocesos generan fallos, detén el bucle (`Ctrl+C`) e incrementa `TENANT_DLQ_REPROCESS_DISABLED=true` (feature flag) para pausar reintentos automáticos.
2. Restaura eventos reinsertándolos en la DLQ usando el respaldo tomado:
   ```bash
   psql "$TENANT_DB_URL" <<'SQL'
   CREATE TEMP TABLE tmp_dlq(id uuid, type text, failed_at timestamptz);
   \copy tmp_dlq FROM 'dlq-backup.tsv'
   INSERT INTO outbox_events_dlq (id, aggregate_type, aggregate_id, type, payload, created_at, failed_at, last_error, retry_count, original_status, moved_reason)
   SELECT d.id, e.aggregate_type, e.aggregate_id, e.type, e.payload, e.created_at, NOW(), e.last_error, e.retry_count, 'failed_permanent', 'rollback'
   FROM tmp_dlq d
   JOIN outbox_events e ON e.id = d.id;
   SQL
   ```
3. Restablece métricas de control confirmando que `outbox_dlq_size` vuelve al valor previo a la intervención.
4. Escala al equipo de dominio para corregir definitivamente la causa antes de un nuevo intento.

## Contacts
- **On-call Plataforma**: `#oncall-plataforma` (Slack) / oncall@smartedify.com
- **Equipo Tenant Service**: tenant-core@smartedify.com
- **Observabilidad**: `#obs-alerts` para dashboards y soporte de métricas
