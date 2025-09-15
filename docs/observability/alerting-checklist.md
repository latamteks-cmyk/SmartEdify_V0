# Checklist de Alertas SRE – SmartEdify (Inicial)

Estado: Draft inicial (enfocado en Tenant Service + Outbox/Consumer)  
Última actualización: 2025-09-14

## Objetivos
Proveer un set mínimo de alertas accionables que cubran: disponibilidad de pipeline de eventos, latencia de procesamiento, crecimiento anómalo de backlog y calidad de handlers.

## Convenciones
- Prefijo de métricas ya en uso (Prometheus): `outbox_`, `consumer_`, `broker_consumer_`.
- Reglas escritas para Prometheus + Alertmanager.
- Duraciones iniciales conservadoras (evitan ruido en early stage). Ajustar tras 2 semanas de observación.

## Tabla Resumen
| Dominio | Métrica / Regla | Objetivo | Severidad | Acción sugerida |
|---------|-----------------|----------|-----------|-----------------|
| Backlog | `broker_consumer_lag_max > 10000 for 5m` | Evitar saturación | P1 | Verificar disponibilidad handlers / throttling broker |
| Backlog | `increase(broker_consumer_lag_max[10m]) > 20000` | Crecimiento acelerado | P2 | Escalar consumidores / investigar stuck partition |
| Éxito | `rate(consumer_events_processed_total{status="error"}[15m]) / rate(consumer_events_processed_total[15m]) > 0.02` | Error ratio <2% | P2 | Revisar top eventTypes fallando |
| Retries | `rate(consumer_retry_attempts_total[10m]) > 50` | Retries controlados | P3 | Verificar dependencias externas (DB, APIs) |
| Latencia | `histogram_quantile(0.95, sum(rate(consumer_process_duration_seconds_bucket[5m])) by (le)) > 0.5` | p95 < 500ms | P2 | Perf profiling handler lento |
| Outbox | `rate(outbox_failed_total[10m]) > 0` AND `rate(outbox_published_total[10m]) == 0` | Publicación detenida | P1 | Revisar publisher / credenciales broker |
| Outbox | `outbox_pending > 2000` | Evitar cola grande | P2 | Verificar poller frecuencia / locks DB |
| DLQ | `outbox_dlq_size > 0` | DLQ vacío esperado | P3 | Reprocesar / abrir ticket dominio |
| Handler Missing | `increase(consumer_handler_not_found_total[15m]) > 0` | Config sync | P3 | Registrar handler o filtrar evento desconocido |
| Infra | `up{job="tenant-service"} == 0` | Disponibilidad | P1 | Reiniciar / investigar crash loop |

## Reglas Prometheus (ejemplos)
```yaml
groups:
  - name: smartedify-event-pipeline
    interval: 30s
    rules:
      - alert: ConsumerBacklogHigh
        expr: broker_consumer_lag_max > 10000
        for: 5m
        labels:
          severity: critical
          service: tenant-service
        annotations:
          summary: "Lag elevado en consumidor"
          description: "Lag máximo {{ $value }} > 10k durante 5m. Posible cuello de botella en handlers o caída de instancias."

      - alert: ConsumerErrorRatioHigh
        expr: (rate(consumer_events_processed_total{status="error"}[15m]) / rate(consumer_events_processed_total[15m])) > 0.02
        for: 10m
        labels:
          severity: warning
          service: tenant-service
        annotations:
          summary: "Ratio de errores >2%"
          description: "Error ratio sostenido. Revisar logs de handlers más frecuentes."

      - alert: ConsumerRetriesSurge
        expr: rate(consumer_retry_attempts_total[10m]) > 50
        for: 10m
        labels:
          severity: warning
          service: tenant-service
        annotations:
          summary: "Aumento inusual de retries"
          description: "Posibles fallos intermitentes dependencias externas. Investigar latencias y status codes."

      - alert: ConsumerLatencyP95Degraded
        expr: histogram_quantile(0.95, sum(rate(consumer_process_duration_seconds_bucket[5m])) by (le)) > 0.5
        for: 15m
        labels:
          severity: warning
          service: tenant-service
        annotations:
          summary: "p95 procesamiento >500ms"
          description: "Handlers lentos. Identificar eventType con mayor duración promedio."

      - alert: OutboxPublishingStalled
        expr: rate(outbox_published_total[10m]) == 0 and rate(outbox_failed_total[10m]) > 0
        for: 10m
        labels:
          severity: critical
          service: tenant-service
        annotations:
          summary: "Publicación outbox detenida"
          description: "Fallas sin publicaciones exitosas recientes. Revisar credenciales broker o saturación DB."

      - alert: OutboxPendingBacklog
        expr: outbox_pending > 2000
        for: 15m
        labels:
          severity: warning
          service: tenant-service
        annotations:
          summary: "Outbox pending elevado"
          description: "La cola pending supera 2000. Ajustar poll interval o escalar servicio."

      - alert: DLQNotEmpty
        expr: outbox_dlq_size > 0
        for: 30m
        labels:
          severity: info
          service: tenant-service
        annotations:
          summary: "Eventos en DLQ"
          description: "Existen eventos en DLQ. Revisar y reprocesar si procede."

      - alert: HandlerMissingEvents
        expr: increase(consumer_handler_not_found_total[15m]) > 0
        for: 15m
        labels:
          severity: info
          service: tenant-service
        annotations:
          summary: "Eventos sin handler"
          description: "Se recibieron eventos sin handler registrado. Confirmar despliegues coordinados."
```

## Runbook (resumen de acciones)
| Alerta | Diagnóstico rápido | Acción 1 | Acción 2 | Escalado |
|--------|--------------------|----------|----------|----------|
| ConsumerBacklogHigh | Verificar CPU/heap, métricas inflight | Escalar réplicas | Aumentar max concurrency (si seguro) | Equipo backend |
| ConsumerErrorRatioHigh | Inspeccionar logs por eventType | Deshabilitar handler defectuoso temporalmente | Hotfix / rollback | Equipo dominio + backend |
| ConsumerRetriesSurge | Identificar dependencia (DB/API) latente | Revisar latencias infra | Activar fallback/circuit breaker | Infra/SRE |
| ConsumerLatencyP95Degraded | Identificar top N handlers lentos | Profiling (flamegraph) | Optimizar consultas / caché | Backend |
| OutboxPublishingStalled | Verificar conectividad broker | Reiniciar publisher | Rotar credenciales / failover | Infra/SRE |
| OutboxPendingBacklog | Revisar locks DB y poll interval | Escalar poller | Particionar workload | Infra + Backend |
| DLQNotEmpty | Consultar `/outbox/dlq` | Reprocesar selectivamente | Abrir ticket análisis | Dominio |
| HandlerMissingEvents | Confirmar naming eventType | Deploy handler faltante | Filtrar en source | Backend |

## Próximas Iteraciones
- Añadir alertas de saturación GC / heap.
- Integrar tracing para correlacionar p95 con spans lentos.
- Ajustar thresholds con percentiles históricos reales.
- Añadir alerta sobre ratio de reprocess DLQ fallidos.

---
Este documento evolucionará conforme crezca el volumen y complejidad del tráfico.
