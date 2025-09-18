# Checklist de Alertas SRE – SmartEdify

Estado: Activo (Auth + Tenant)
Última actualización: 2025-09-24

## Objetivos
Garantizar que cada alerta crítica tenga tablero, procedimiento y responsables claros, cubriendo disponibilidad del pipeline de eventos, experiencia de login y abuso de credenciales.

## Convenciones
- Métricas Prometheus prefijadas: `auth_`, `outbox_`, `consumer_`, `broker_consumer_`.
- Todas las reglas viven en el grupo `smartedify-core-services` y se sincronizan via GitOps.
- Cada alerta exige captura o enlace al dashboard exportado correspondiente como evidencia en el ticket de incidente.

## Tableros publicados
- **Auth Service · Negocio y SLO** → [export JSON](./dashboards/auth-service.json) (carpeta Grafana `SmartEdify / Core Services`). Filtros: `environment` (obligatorio), `tenant` (multi-select, opción `All`).
- **Tenant Service · Outbox & Consumers** → [export JSON](./dashboards/tenant-service.json). Filtros: `environment` (obligatorio), `consumer` (`tenant-consumer` por defecto).

## Tabla Resumen
| Dominio | Métrica / Regla | Objetivo | Severidad | Acción sugerida | Dashboard | Runbook |
|---------|-----------------|----------|-----------|-----------------|-----------|---------|
| Auth | `histogram_quantile(0.95, sum(rate(auth_http_request_duration_seconds_bucket{route="/login"}[5m])) by (le)) > 0.25` durante 15m | p95 < 250ms | P1 | Revisar despliegues, dependencia IdP | Auth Service · Negocio y SLO (panel *Latency p95 /login*) | [`auth-login-latency.md`](../runbooks/auth-login-latency.md) |
| Auth | `rate(auth_login_success_total[5m]) / (rate(auth_login_success_total[5m]) + rate(auth_login_fail_total[5m])) < 0.92` durante 20m | ≥ 92% | P1/P0 si <0.85 | Analizar caída por tenant, activar feature flag de degradación | Auth Service · Negocio y SLO (panel *Login success ratio*) | [`auth-login-latency.md`](../runbooks/auth-login-latency.md) |
| Auth | `increase(auth_refresh_reuse_blocked_total[5m]) > 0` | 0 reuse detectado | P0 | Bloquear tenant, rotar claves | Auth Service · Negocio y SLO (panel *Token revocations & reuse*) | [`auth-login-latency.md`](../runbooks/auth-login-latency.md) |
| Backlog | `broker_consumer_lag_max > 10000 for 5m` | Lag < 10k | P1 | Escalar réplicas / throughput | Tenant Service · Outbox & Consumers (panel *Lag consumidor*) | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| Backlog | `increase(broker_consumer_lag_max[10m]) > 20000` | Crecimiento controlado | P2 | Investigar partición bloqueada | Tenant Service · Outbox & Consumers | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| Éxito | `rate(consumer_events_processed_total{status="error"}[15m]) / rate(consumer_events_processed_total[15m]) > 0.02` | Error ratio <2% | P2 | Revisar eventType con error | Tenant Service · Outbox & Consumers (panel *Procesamiento de eventos*) | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| Retries | `rate(consumer_retry_attempts_total[10m]) > 50` | Retries controlados | P3 | Revisar dependencias externas | Tenant Service · Outbox & Consumers | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| Latencia | `histogram_quantile(0.95, sum(rate(consumer_process_duration_seconds_bucket[5m])) by (le)) > 0.5` | p95 < 500ms | P2 | Profiling handler lento | Tenant Service · Outbox & Consumers (panel *Latencia p95 consumidor*) | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| Outbox | `rate(outbox_failed_total[10m]) > 0` AND `rate(outbox_published_total[10m]) == 0` | Publicación continua | P1 | Revisar publisher / credenciales broker | Tenant Service · Outbox & Consumers (panel *Estado de outbox*) | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| Outbox | `outbox_pending > 2000` | Cola controlada | P2 | Ajustar poll interval / locks | Tenant Service · Outbox & Consumers | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| DLQ | `outbox_dlq_size > 0` | DLQ vacío | P3 | Ejecutar reprocesamiento | Tenant Service · Outbox & Consumers (tabla *Eventos DLQ por tipo*) | [`dlq-reprocessing.md`](../runbooks/dlq-reprocessing.md) |
| Handler Missing | `increase(consumer_handler_not_found_total[15m]) > 0` | Config sincronizada | P3 | Registrar handler / filtrar evento | Tenant Service · Outbox & Consumers | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |
| Infra | `up{job="tenant-service"} == 0` | Servicio activo | P1 | Reiniciar / investigar crash loop | Tenant Service · Outbox & Consumers (validar retorno de métricas) | [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) |

## Reglas Prometheus (extracto)
```yaml
groups:
  - name: smartedify-core-services
    interval: 30s
    rules:
      - alert: AuthLoginLatencyP95Degraded
        expr: histogram_quantile(0.95, sum(rate(auth_http_request_duration_seconds_bucket{route="/login",status="200"}[5m])) by (le)) > 0.25
        for: 15m
        labels:
          severity: critical
          service: auth-service
        annotations:
          summary: "Latencia p95 /login degradada"
          runbook: "../runbooks/auth-login-latency.md"

      - alert: OutboxPublishingStalled
        expr: rate(outbox_published_total[10m]) == 0 and rate(outbox_failed_total[10m]) > 0
        for: 10m
        labels:
          severity: critical
          service: tenant-service
        annotations:
          summary: "Publicación outbox detenida"
          runbook: "../runbooks/tenant-consumer-lag.md"
```

## Runbook (resumen de acciones)
| Alerta | Diagnóstico rápido (dashboard) | Acción 1 | Acción 2 | Evidencia requerida | Escalado |
|--------|-------------------------------|----------|----------|--------------------|----------|
| AuthLoginLatencyP95Degraded | Captura panel *Latency p95 /login* filtrado por `environment` | Revisar despliegues últimos 30m | Rollback si persiste >2 ventanas | Screenshot + query PromQL | Equipo Auth + On-call |
| AuthLoginSuccessDrop | Panel *Login success ratio* + breakdown por `tenant` | Revisar feature flags / dependencias | Activar modo degradado (`AUTH_LOGIN_GUARDIAN`) | Tabla de tenants afectados | Equipo Auth + Producto |
| AuthRefreshReuseDetected | Panel *Token revocations & reuse* | Bloquear tenant y revocar tokens | Coordinar rotación clave | Export CSV `auth_refresh_reuse_blocked_total` | Seguridad + Auth |
| ConsumerBacklogHigh | Panel *Lag consumidor* + logs `tenant-consumer` | Escalar réplicas / throughput | Ejecutar [`tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) | Screenshot + `broker_consumer_lag_max` | Equipo Tenant + SRE |
| ConsumerErrorRatioHigh | Panel *Procesamiento de eventos* (split status) | Identificar eventType con error | Deshabilitar handler / parchear | Lista de eventTypes top | Equipo Tenant + Dominio |
| ConsumerLatencyP95Degraded | Panel *Latencia p95 consumidor* | Identificar handler lento | Optimizar consultas / caches | Antes/después del panel | Backend |
| OutboxPublishingStalled | Panel *Estado de outbox* + logs publisher | Revisar conectividad broker | Rotar credenciales / failover | Métricas `outbox_failed_total` post-fix | Infra/SRE |
| OutboxPendingBacklog | Panel *Estado de outbox* | Ajustar poll interval | Escalar poller horizontal | Gráfico `outbox_pending` < umbral | Infra + Backend |
| DLQNotEmpty | Tabla *Eventos DLQ por tipo* | Ejecutar [`dlq-reprocessing.md`](../runbooks/dlq-reprocessing.md) | Escalar a dominio si causa abierta | Snapshot + CSV | Dominio |
| HandlerMissingEvents | Panel *Procesamiento de eventos* | Registrar handler faltante | Coordinar despliegue | Log del evento desconocido | Backend |
| InfraDown | Paneles sin datos + `up{job="tenant-service"}` | Ejecutar smoke `/healthz` | Reiniciar / escalar a plataforma | `kubectl get pods` adjunto | SRE |

## Próximas Iteraciones
- Añadir alerta de saturación GC/heap (`process_resident_memory_bytes`).
- Integrar tracing → correlacionar paneles p95 con spans en Tempo (Auth y Tenant).
- Ajustar thresholds con percentiles históricos exportados.
- Publicar checklist automática post-incident en Notion (sincroniza con este documento).

---
Este documento evolucionará conforme crezca el volumen y complejidad del tráfico.
