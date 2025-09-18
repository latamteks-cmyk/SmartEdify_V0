# Observabilidad – Servicios Backend

Este documento centraliza los tableros publicados, objetivos de SLO y alertas para los servicios Auth y Tenant. Cada tablero está exportado en `docs/observability/dashboards/` para garantizar trazabilidad y versionamiento.

## Resumen de tableros y ownership

| Servicio | Dashboard principal | Archivo JSON | Filtros claves | Owners | Alerta asociada |
|----------|---------------------|--------------|----------------|--------|-----------------|
| Auth | `Auth Service · Negocio y SLO` (`https://grafana.smartedify.internal/d/auth-business/auth-service`) | [`dashboards/auth-service.json`](./dashboards/auth-service.json) | `environment`, `tenant` (multi-select con regex `/.*/`) | `sre@smartedify.com`, `security@smartedify.com`, PM Auth | `AuthLoginLatencyP95Degraded`, `AuthLoginSuccessDrop`, `AuthRefreshReuseDetected` |
| Tenant | `Tenant Service · Outbox & Consumers` (`https://grafana.smartedify.internal/d/tenant-outbox/tenant-service`) | [`dashboards/tenant-service.json`](./dashboards/tenant-service.json) | `environment`, `consumer` | `sre@smartedify.com`, `tenant-core@smartedify.com`, PM Tenant | `ConsumerBacklogHigh`, `OutboxPublishingStalled`, `ConsumerErrorRatioHigh` |

> **Permisos:** Ambos tableros comparten carpeta `SmartEdify / Core Services` en Grafana con acceso de lectura a Observabilidad, SRE y los PM de cada dominio. La edición está restringida al equipo de Observabilidad.

### Cómo usar los filtros
- **Environment:** determina el clúster objetivo (`production`, `staging`, `load`). El filtro se alimenta dinámicamente del `label_values` Prometheus correspondiente y se sincroniza en todas las visualizaciones.
- **Tenant (Auth):** soporta selección múltiple y la opción `All` (regex `/.*/`) para comparar tenants específicos tras incidentes de abuso.
- **Consumer group (Tenant):** filtra métricas por grupo Kafka (`tenant-consumer`, `tenant-projection`, etc.). Útil para aislar backlog por handler.

## Auth Service

### Indicadores y SLO
Los siguientes objetivos cubren latencia, éxito y abuso de tokens para Auth. Cada SLO tiene alerta directa en Prometheus/Alertmanager y referencia al runbook [`../runbooks/auth-login-latency.md`](../runbooks/auth-login-latency.md).

| Métrica | Objetivo (SLO) | Medición | Regla de alerta |
|---------|----------------|----------|-----------------|
| Latencia p95 de `/login` | p95 < 250 ms en ventana rodante de 30 minutos | `histogram_quantile(0.95, sum(rate(auth_http_request_duration_seconds_bucket{route="/login",status="200"}[5m])) by (le))` | `> 0.25` por 15 minutos dispara **AuthLoginLatencyP95Degraded** (warning). |
| Tasa de éxito de login | ≥ 92 % éxitos / (éxitos + fallos) en 60 minutos | `rate(auth_login_success_total[5m]) / (rate(auth_login_success_total[5m]) + rate(auth_login_fail_total[5m]))` | `< 0.92` durante 20 minutos activa **AuthLoginSuccessDrop** (critical si <0.85). |
| Reuse rate de refresh tokens | == 0 detecciones en ventana de 5 minutos | `increase(auth_refresh_reuse_blocked_total[5m])` | `> 0` por 5 minutos emite **AuthRefreshReuseDetected** (critical). |

### Automatización y verificaciones
- Job `auth-slo-canary` (cron horario) evalúa queries PromQL anteriores y adjunta screenshot del tablero (`Auth Service · Negocio y SLO`) en `#auth-observability`.
- El runbook de rotación JWKS y el de degradación de login utilizan la sección *Token revocations & reuse* del dashboard exportado para validar propagación de deny-list y detectar abuso.

## Tenant Service

### Indicadores y SLO
Los objetivos cubren el pipeline outbox → consumidor y DLQ. Las alertas redirigen al runbook [`../runbooks/tenant-consumer-lag.md`](../runbooks/tenant-consumer-lag.md) y al existente [`../runbooks/dlq-reprocessing.md`](../runbooks/dlq-reprocessing.md).

| Métrica | Objetivo (SLO) | Medición | Regla de alerta |
|---------|----------------|----------|-----------------|
| Lag máximo del consumidor | `< 10 000` mensajes sostenidos por < 5 minutos | `max(broker_consumer_lag_max{consumer_group="tenant-consumer"})` | `> 10000` por 5 minutos dispara **ConsumerBacklogHigh** (critical). |
| Ratio de errores del consumidor | `< 2 %` en ventana de 15 minutos | `rate(consumer_events_processed_total{status="error"}[15m]) / rate(consumer_events_processed_total[15m])` | `> 0.02` por 10 minutos dispara **ConsumerErrorRatioHigh** (warning). |
| Latencia p95 de procesamiento | `< 500 ms` en ventana de 15 minutos | `histogram_quantile(0.95, sum(rate(consumer_process_duration_seconds_bucket[5m])) by (le))` | `> 0.5` por 15 minutos dispara **ConsumerLatencyP95Degraded** (warning). |
| Publicación outbox | `outbox_published_total > 0` en ventanas de 10 minutos | `rate(outbox_published_total[10m])` | `== 0` con `rate(outbox_failed_total[10m]) > 0` emite **OutboxPublishingStalled** (critical). |
| DLQ activa | `outbox_dlq_size == 0` o < 10 eventos | `outbox_dlq_size` | `> 0` sostenido 30 minutos dispara **DLQNotEmpty** (info con recordatorio). |

### Automatización y verificaciones
- Job `tenant-outbox-sweeper` (cron cada 15 minutos) publica snapshot CSV del panel *Eventos DLQ por tipo (última hora)* en `#tenant-observability`.
- Cron `tenant-consumer-lag-report` (cada 5 minutos) captura panel *Lag consumidor* y compara contra el SLO, notificando en `PagerDuty` si la tendencia se mantiene > 15 minutos.
- Tras incidentes de backlog, se guarda evidencia del panel filtrado por `consumer_group` en la carpeta de incidentes (`incidents/YYYY/MM-DD`).

## Consideraciones operativas transversales
- Los SLO de ambos servicios se reportan semanalmente en `docs/status.md` y se validan tras cada despliegue relevante (ver sección de *Operación diaria*).
- El *error budget* de Auth (tasa de éxito) es 8 % mensual; el de Tenant (lag) permite hasta 2 ventanas críticas por sprint antes de activar plan de capacidad.
- Todas las alertas envían a `#oncall-plataforma` con mención al owner de producto correspondiente y enlazan al runbook de la alerta.

## Correlación de trazas y outbox
- Los spans HTTP del servicio de autenticación (`auth.login`, `auth.register`, `auth.refresh` y administrativos) exponen atributos `auth.user_id`, `auth.tenant_id` y `auth.result`. Estos valores permiten filtrar en Tempo las mismas entidades observadas en el dashboard de Auth.
- Los eventos `login.success`/`login.failure`, `refresh.success`/`refresh.failure` y los eventos administrativos generan anotaciones correlacionadas en Grafana (utiliza el panel *Token revocations & reuse* como ancla temporal).
- El servicio de tenants adjunta el encabezado W3C `traceparent` en el payload outbox para `tenant.created`, `unit.created`, `membership.added` y `governance.changed`. Al consumir los eventos, propaga `traceparent` como header Kafka para reconstruir el flujo end-to-end (HTTP → outbox → consumer).
- Consulta `docs/design/diagrams/tracing-span-map.mmd` para el mapa actualizado de spans y atributos compartidos.
