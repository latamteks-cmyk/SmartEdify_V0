# Runbook — Degradación de login Auth Service

> **Dashboards**
> - [`Auth Service · Negocio y SLO`](../observability/dashboards/auth-service.json)
> - Paneles clave: *Latency p95 /login*, *Login success ratio*, *Token revocations & reuse*
>
> **Alertas cubiertas:** `AuthLoginLatencyP95Degraded`, `AuthLoginSuccessDrop`, `AuthRefreshReuseDetected`
> **Contacto:** `#oncall-plataforma`, `auth-core@smartedify.com`, `security@smartedify.com`

## Preconditions
- Alerta activa en PagerDuty o en Slack `#obs-alerts`.
- Acceso a Grafana (folder `SmartEdify / Core Services`).
- Acceso a métricas Prometheus (`kubectl port-forward` o VPN) para ejecutar consultas ad-hoc.
- Verificar últimas implementaciones (`scripts/deploy.sh --history auth-service`).

## Diagnóstico inicial (5 minutos)
1. **Capturar tablero.** Filtra el dashboard por `environment` y, si aplica, selecciona los tenants reportados en la alerta.
   - Exporta screenshot de los paneles *Latency p95 /login* y *Login success ratio*.
   - Adjunta la URL del panel específico (Grafana genera permalinks) en el ticket.
2. **Confirmar en PromQL.**
   ```bash
   # Latencia p95 (ms)
   kubectl -n monitoring exec deploy/prometheus -- \
     promtool query instant http://localhost:9090 \
     "histogram_quantile(0.95, sum(rate(auth_http_request_duration_seconds_bucket{route='/login',environment='production'}[5m])) by (le)) * 1000"
   ```
   - Repite con `tenant_id` sospechoso para aislar la degradación.
3. **Revisar distribución de códigos.**
   ```bash
   kubectl logs deploy/auth-service -n auth --since=10m | grep "POST /login" | jq '.status' | sort | uniq -c
   ```
4. **Verificar dependencias externas (IdP / DB).** Comprueba latencias en `Auth Service · Salud técnica` si procede.

## Contención
- **Latencia degradada:**
  1. Desactivar experimentos o features recientes (`AUTH_LOGIN_GUARDIAN`, `AUTH_RATE_LIMITER_BYPASS`).
  2. Hacer rollback al último release estable:
     ```bash
     ./scripts/deploy.sh --service auth-service --environment production --ref <sha_estable>
     ```
  3. Forzar warmup ejecutando `./scripts/smoke-test.sh --service auth-service --environment production`.
- **Caída de tasa de éxito:**
  1. Identificar tenant afectado (`tenant_id` en panel y alerta) y activar `tenant:lock` vía feature flag service.
  2. Escalar a producto si el impacto es >5 % usuarios.
- **Detección de reuse:**
  1. Revocar tokens del tenant comprometido (`POST /admin/tenants/{id}/tokens/revoke`).
  2. Considerar rotación de clave si se sospecha filtración (ver `docs/operations/incident-auth-key-rotation.md`).

## Validación
- Confirmar que el panel *Latency p95 /login* vuelve < 250 ms y la tasa de éxito > 92 % durante al menos 3 ventanas consecutivas (15 minutos).
- Ejecutar smoke tests (`./scripts/smoke-test.sh --service auth-service`) y adjuntar salida en ticket.
- Registrar en el incidente la consulta PromQL final y los tenants desbloqueados.

## Comunicación
- Notificar resultado en `#oncall-plataforma` con resumen (impacto, causa raíz, acciones).
- Actualizar `docs/status.md` si el incidente afecta indicadores ejecutivos.
- Iniciar postmortem si el SLO consume >25 % de error budget.

## Post-incident
- Crear issue para automatizar mitigación (por ejemplo, ajuste de timeouts o circuit breakers).
- Añadir aprendizaje en la sección *Operación diaria* (`docs/operations/daily-operations.md`).
- Programar revisión de dashboards para asegurar que nuevos paneles reflejan la causa raíz.
