# Runbook — Backlog / Latencia Tenant Service

> **Dashboards**
> - [`Tenant Service · Outbox & Consumers`](../observability/dashboards/tenant-service.json)
> - Paneles clave: *Lag consumidor*, *Procesamiento de eventos*, *Estado de outbox*, *Eventos DLQ por tipo*
>
> **Alertas cubiertas:** `ConsumerBacklogHigh`, `ConsumerErrorRatioHigh`, `ConsumerLatencyP95Degraded`, `OutboxPublishingStalled`, `OutboxPendingBacklog`, `HandlerMissingEvents`, `InfraDown`
> **Contacto:** `#oncall-plataforma`, `tenant-core@smartedify.com`, `data-platform@smartedify.com`

## Preconditions
- Alerta activa o incidente registrado.
- Acceso a Grafana y permalinks habilitados.
- Credenciales para `kubectl` (namespace `tenants`) y DB `tenant_service`.
- Opcional: acceso a herramientas de tracing para correlacionar spans (`Tempo`).

## Diagnóstico inicial (5 minutos)
1. **Capturar tablero.** Filtra por `environment` y el `consumer` afectado.
   - Guarda screenshot de *Lag consumidor* y *Procesamiento de eventos*.
   - Exporta tabla *Eventos DLQ por tipo* (`Download CSV`) si hay entradas recientes.
2. **Confirmar lag en PromQL.**
   ```bash
   kubectl -n monitoring exec deploy/prometheus -- \
     promtool query instant http://localhost:9090 \
     "max(broker_consumer_lag_max{consumer_group='tenant-consumer',environment='production'})"
   ```
3. **Verificar estado del pod.**
   ```bash
   kubectl get pods -n tenants -l app=tenant-consumer
   kubectl logs deploy/tenant-consumer -n tenants --since=5m | tail -n 200
   ```
4. **Revisar outbox.** Ejecuta `SELECT count(*) FROM outbox_events WHERE status = 'pending';` para confirmar backlog en DB.

## Mitigación
- **Lag elevado (>10k):**
  1. Escalar réplicas del consumidor:
     ```bash
     kubectl scale deploy/tenant-consumer -n tenants --replicas=<n>
     ```
  2. Incrementar `CONSUMER_MAX_INFLIGHT` temporalmente (parámetro Helm) si CPU < 70 %.
  3. Verificar throughput del broker (`kafka-consumer-groups --describe`).
- **Errores recurrentes:**
  1. Identificar `eventType` en panel *Procesamiento de eventos*.
  2. Buscar traza Tempo (`service.name="tenant-consumer" span.kind="server" event.type='<type>'`).
  3. Deshabilitar handler defectuoso (`feature flag handler:<type>`) y notificar al dominio correspondiente.
- **Outbox detenida:**
  1. Revisar panel *Estado de outbox* y logs del publisher (`kubectl logs deploy/tenant-outbox-poller`).
  2. Verificar credenciales broker (`SECRET_OUTBOX_BROKER`) y reintentar conexión.
  3. Si falla, ejecutar script de failover: `./scripts/outbox/failover.sh --service tenant`.
- **DLQ creciente:**
  1. Seguir [`dlq-reprocessing.md`](./dlq-reprocessing.md).
  2. Priorizar eventTypes con mayor conteo.

## Validación
- Confirmar que *Lag consumidor* < 5 000 mensajes y tendencia descendente durante 3 ventanas de 5 minutos.
- Panel *Procesamiento de eventos* debe mostrar `status=success` dominante (>98 %).
- `outbox_pending` estabilizado por debajo de 1 000 en panel correspondiente.
- `kubectl get pods` sin reinicios y métricas `up{job="tenant-service"}` = 1.

## Comunicación
- Publicar resumen en `#tenant-observability` con permalinks a paneles y métricas.
- Registrar en incidente (Jira/Notion) los valores antes/después y acciones aplicadas.
- Actualizar `docs/status.md` si se consumió >15 % del error budget de lag.

## Post-incident
- Programar capacity review si el pico se repite (>2 veces por sprint).
- Añadir aprendizaje en `docs/operations/daily-operations.md` (sección Tenant Service).
- Revisar thresholds del alerting checklist e incorporar nuevas métricas si surgieron durante el incidente.
