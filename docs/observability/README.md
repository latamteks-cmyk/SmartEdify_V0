# Observabilidad – Auth Service

Este documento resume los tableros compartidos, SLO y alertas operativas que gobiernan el servicio de autenticación de SmartEdify.

## Dashboards compartidos
- **Auth Service · Métricas de negocio** (`https://grafana.smartedify.internal/d/auth-business/auth-service`)
  - Panel *Conversion de login*: `rate(auth_login_success_total[5m])` vs `rate(auth_login_fail_total[5m])`.
  - Panel *Reutilización de refresh tokens*: `increase(auth_refresh_reuse_blocked_total[15m])` con desglose por `tenant_id`.
  - Panel *Tokens revocados*: `rate(auth_token_revoked_total{type="access"}[5m])` y `rate(auth_token_revoked_total{type="refresh"}[5m])`.
- **Auth Service · Salud técnica** (`https://grafana.smartedify.internal/d/auth-tech/auth-runtime`)
  - Latencia HTTP (`auth_http_request_duration_seconds`), errores 5xx y uso de pool PostgreSQL.
  - Sección dedicada a JWKS: `auth_jwks_keys_total`, `auth_jwks_rotation_total`, edad de clave `current`.

Ambos dashboards tienen permisos de lectura para `sre@smartedify.com`, `security@smartedify.com` y los líderes de producto de autenticación.

## SLO y alertas
Los siguientes objetivos cubren los indicadores clave solicitados (p95 login, tasa de éxito y reuse rate). Cada SLO cuenta con una alerta asociada en Prometheus/Alertmanager.

| Métrica | Objetivo (SLO) | Medición | Regla de alerta |
|---------|----------------|----------|-----------------|
| Latencia p95 de `/login` | p95 < 250 ms en ventana rodante de 30 minutos | `histogram_quantile(0.95, sum(rate(auth_http_request_duration_seconds_bucket{route="/login",status="200"}[5m])) by (le))` | `> 0.25` por 15 minutos dispara **AuthLoginLatencyP95Degraded** (warning). |
| Tasa de éxito de login | ≥ 92 % éxitos / (éxitos + fallos) en 60 minutos | `rate(auth_login_success_total[5m]) / (rate(auth_login_success_total[5m]) + rate(auth_login_fail_total[5m]))` | `< 0.92` durante 20 minutos activa **AuthLoginSuccessDrop** (critical si <0.85). |
| Reuse rate de refresh tokens | == 0 detecciones en ventana de 5 minutos | `increase(auth_refresh_reuse_blocked_total[5m])` | `> 0` por 5 minutos emite **AuthRefreshReuseDetected** (critical). |

### Consideraciones operativas
- Los SLO se reportan semanalmente en el snapshot ejecutivo (`docs/status.md`) y se validan tras cada despliegue relevante.
- El *error budget* para la tasa de éxito se fija en 8 % mensual; al consumir >50 % se gatilla revisión con producto.
- Las alertas se integran con `#oncall-plataforma` y abren incidentes automáticos en PagerDuty.

## Automatización de verificación
- Job `auth-slo-canary` (cron horario) ejecuta queries PromQL anteriores y adjunta resultados al canal `#auth-observability`.
- El runbook de rotación JWKS se apoya en el panel *Tokens revocados* para validar la propagación de deny-list.
