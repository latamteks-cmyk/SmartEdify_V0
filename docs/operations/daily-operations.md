# Operación diaria – Core Services

> **Propósito:** Consolidar los chequeos rutinarios (manuales y automatizados) que garantizan salud operativa en Auth y Tenant Service.
> **Alcance:** producción y staging.

## Rondas AM (08:00 UTC)
| Paso | Responsable | Herramienta | Evidencia |
|------|-------------|-------------|-----------|
| Validar tableros SLO | On-call Plataforma | Grafana (`Auth Service · Negocio y SLO`, `Tenant Service · Outbox & Consumers`) | Screenshot almacenado en `ops-daily/YYYY-MM-DD/` |
| Revisar alertas nocturnas | On-call Plataforma | Alertmanager / PagerDuty | Resumen en `#oncall-plataforma` |
| Confirmar jobs cron | Observabilidad | `kubectl get cronjobs -n ops` (`auth-slo-canary`, `tenant-outbox-sweeper`, `tenant-consumer-lag-report`) | Output guardado en ticket diario |
| Checar backlog DLQ | Tenant Core | Dashboard tabla *Eventos DLQ por tipo* + `outbox_dlq_size` | Comentario en Jira `OPS-DAILY` |

## Rondas PM (18:00 UTC)
1. **Auth Service**
   - Revisar panel *Token revocations & reuse* buscando spikes.
   - Verificar que job `auth-slo-canary` adjuntó screenshot en `#auth-observability`.
   - Ejecutar validación rápida:
     ```bash
     kubectl -n monitoring exec deploy/prometheus -- promtool query instant http://localhost:9090 \
       "histogram_quantile(0.95, sum(rate(auth_http_request_duration_seconds_bucket{route='/login',environment='production'}[5m])) by (le))"
     ```
   - Si valores fuera de rango → seguir [`auth-login-latency.md`](../runbooks/auth-login-latency.md).
2. **Tenant Service**
   - Panel *Lag consumidor* < 5 000 en últimas 3 ventanas; registrar valor en `ops-daily`.
   - Confirmar ejecución cron `tenant-outbox-sweeper` (`kubectl logs job/<name> -n tenants | tail`).
   - Revisar `outbox_pending` y `outbox_failed` desde dashboard; si > 1 000 o >0 respectivamente activar [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) o [`dlq-reprocessing.md`](../runbooks/dlq-reprocessing.md).

## Post-deploy checklist (aplica a cada promoción)
| Servicio | Paso | Responsable | Documento |
|----------|------|-------------|-----------|
| Auth | Confirmar panel *Latency p95 /login* < 250 ms (15 min) | Equipo Auth | [`auth-login-latency.md`](../runbooks/auth-login-latency.md) |
| Auth | Validar reuse rate == 0 tras despliegue | Seguridad | [`auth-login-latency.md`](../runbooks/auth-login-latency.md) |
| Tenant | Panel *Lag consumidor* estable (sin pendiente positiva) | Tenant Core | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| Tenant | DLQ sin crecimiento (>10) | Tenant Core | [`dlq-reprocessing.md`](../runbooks/dlq-reprocessing.md) |

## Registro y trazabilidad
- Guardar todas las evidencias (capturas, outputs de comandos) en la carpeta `ops-daily/YYYY/MM-DD` dentro de SharePoint.
- Actualizar el snapshot ejecutivo (`docs/status.md`) si:
  - Se consumió >15 % del error budget de un SLO.
  - Un cron job falló más de dos veces consecutivas.
  - Se ejecutó un runbook completo.
- Registrar aprendizajes y ajustes pendientes en `task.md` bajo la sección "Operación diaria".

## Automatizaciones
- `auth-slo-canary` (cron horario): exporta métricas PromQL y captura del dashboard; falla → abre ticket `OBS-AUTH-<fecha>`.
- `tenant-outbox-sweeper` (cron 15 min): genera CSV de eventos DLQ y alerta si `outbox_dlq_size > 0` por 3 ejecuciones.
- `tenant-consumer-lag-report` (cron 5 min): compara `broker_consumer_lag_max` vs umbral y emite alerta proactiva antes de `ConsumerBacklogHigh`.

## Escalamiento
- Falta de evidencia en una ronda → notificar inmediatamente a `Head of Platform` y registrar en `#oncall-plataforma`.
- Dos fallas consecutivas de cron job → abrir incidente P2 y programar revisión de confiabilidad.

---
Mantener este documento sincronizado con actualizaciones en dashboards o cron jobs para conservar trazabilidad ejecutiva.
