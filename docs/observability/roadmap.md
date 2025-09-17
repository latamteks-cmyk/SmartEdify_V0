# Roadmap de observabilidad

## Principios operativos
- Instrumentación con OpenTelemetry incluyendo atributos `tenant_id`, `service`, `assembly_id|user_id`.
- Logs en formato JSON estructurado y métricas que capturen señales técnicas y de negocio.

## Fases
1. **Actual**: métricas técnicas + logs estructurados (auth-service completo, tenant-service parcial).
2. **Siguiente**: tracing OTel mínimo con spans por endpoint y propagación de `x-request-id` hacia `trace_id`.
3. **Expansión**: métricas de negocio de autenticación (`login_success`, `login_fail`, `refresh_reuse`, `password_reset`) y dashboards.
4. **Madurez**: alertas SLO (latencia p99 login, tasa de fallos refresh, picos de reuse detection) acompañadas de playbooks.
5. **Correlación cross-service**: atributos consistentes (`tenant_id`, `user_id`) entre Assembly, Tenant y Auth.

## Indicadores clave planeados
- `auth_login_success_total`, `auth_login_fail_total` para seguimiento de conversión de login.
- `auth_refresh_reuse_detected_total` con alerta si ocurre >0 en ventanas cortas.
- `tenant_context_fetch_duration_seconds` con objetivo inicial p95 < 120 ms.
- `outbox_pending` versus `outbox_event_age_seconds` con alerta si p95 de age > 5 minutos.

## Smoke de tracing
- Ejecutar `npm run --prefix apps/services/tenant-service test:smoke` para levantar el servicio contra el mock OTLP basado en `observability/otel-collector-config.yaml`.
- La prueba confirma que el pipeline emite spans con `service.name=tenant-service` y atributos de dominio como `tenant.id` y `tenant.code` al crear un tenant.
