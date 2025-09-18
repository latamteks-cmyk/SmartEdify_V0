# Runbook — Rotación de claves (Auth)

> **Referencias:**
> - ADR: [ADR-0007-jwks-rotation.md](../design/adr/ADR-0007-jwks-rotation.md)
> - Diagrama: [jwks-rotation-sequence.mmd](../design/diagrams/jwks-rotation-sequence.mmd)

## Purpose
Ejecutar una rotación controlada de las claves RSA utilizadas por Auth Service para firmar tokens JWT. El objetivo es mitigar exposiciones, cumplir con políticas de rotación y garantizar que los consumidores actualicen el JWKS sin pérdida de disponibilidad.

## Preconditions
- Hay un motivo válido (compromiso, política de 90 días o auditoría) documentado en el ticket.
- Acceso a la base de datos `auth_service` y al endpoint administrativo `POST /admin/rotate-keys` (expuesto internamente).
- Capacidad para ejecutar comandos `openssl`, `uuidgen` y `psql` desde un entorno seguro.
- Confirmación de que el *cache* y los consumidores aceptan claves en estados `current`, `next` y `retiring`.

## Automatización programada
- El workflow de GitHub Actions [`jwks-rotate`](../../.github/workflows/jwks-rotate.yml) se ejecuta automáticamente todos los días a las **05:00 UTC** y puede iniciarse manualmente desde `workflow_dispatch` seleccionando el entorno (`dev|staging|production`).
- La ejecución utiliza `AUTH_SERVICE_BASE_URL` (vars) para construir la URL base, firma la llamada `POST /admin/rotate-keys` con `AUTH_SERVICE_ADMIN_API_KEY` y reutiliza los secretos de Postgres (`AUTH_SERVICE_PGHOST`, `AUTH_SERVICE_PGUSER`, `AUTH_SERVICE_PGPASSWORD`) para calcular métricas de edad.
- Si está definido `JWKS_METRICS_PUSH_URL`, el job envía la métrica `auth_jwks_key_age_hours` al Pushgateway antes de cerrar la conexión a la base de datos.
- El rate limiting administrativo es configurable mediante `AUTH_ADMIN_RATE_LIMIT_WINDOW_MS` y `AUTH_ADMIN_RATE_LIMIT_MAX`; ajustar valores en `Repository/Environment vars` antes de ampliar la frecuencia de ejecuciones manuales.

### Validación post-cron
1. Revisar el run más reciente en GitHub Actions (`Actions > jwks-rotate`); verificar que el nombre del job incluya el entorno esperado y que el estado sea `success`.
2. Consultar el Pushgateway (`curl -s $JWKS_METRICS_PUSH_URL`) y confirmar que `auth_jwks_key_age_hours` muestra timestamp reciente y valores coherentes con la tabla `auth_signing_keys`.
3. Ejecutar `curl -s "$AUTH_API/.well-known/jwks.json" | jq '.keys[] | {kid,status}'` y validar que el `kid` promovido aparece como `current`.
4. Registrar en el ticket del cron (o en el canal on-call) la hora de la ejecución, `kid` resultante y el estado de la validación.

## Step-by-step
1. **Revisar el estado actual y capturar snapshot.**
   ```bash
   export AUTH_API="https://auth-service.prod.smartedify.internal"
   curl -s "$AUTH_API/metrics" | grep auth_jwks_keys_total
   psql "$AUTH_DB_URL" -c "SELECT kid, status, promoted_at, retiring_at FROM auth_signing_keys ORDER BY created_at DESC;"
   curl -s "$AUTH_API/.well-known/jwks.json" | jq '.' > jwks-before.json
   ```
   Confirma que existe una clave `current` válida y, si ya hay `next`, registra su `kid`.

2. **Generar una nueva clave `next` segura (si no existe o está comprometida).**
   - **Opción preferida (dentro del pod):**
     ```bash
     kubectl -n auth exec deploy/auth-service -- node -e "import('./dist/internal/security/keys.js').then(m => m.getNextKey(true).then(()=>process.exit(0)))"
     ```
     El comando utiliza el helper `getNextKey(true)` para crear y persistir automáticamente una nueva clave `next` usando la lógica del servicio.
   - **Alternativa manual (fuera del pod) si la anterior falla:**
     ```bash
     NEXT_KID=$(uuidgen)
     openssl genrsa -out next-private.pem 2048
     openssl rsa -in next-private.pem -pubout -out next-public.pem
     PRIV_ESCAPED=$(python3 - <<'PY'
from pathlib import Path
print(Path('next-private.pem').read_text().replace("'", "''"))
PY
)
     PUB_ESCAPED=$(python3 - <<'PY'
from pathlib import Path
print(Path('next-public.pem').read_text().replace("'", "''"))
PY
)
     psql "$AUTH_DB_URL" <<SQL
     INSERT INTO auth_signing_keys (kid, pem_private, pem_public, status)
     VALUES ('$NEXT_KID', '$PRIV_ESCAPED', '$PUB_ESCAPED', 'next');
     SQL
     rm next-private.pem next-public.pem
     ```
   Verifica que la métrica `auth_jwks_keys_total{status="next"}` refleje el nuevo valor (puede tardar ~30 s por el *cache* interno).

3. **Esperar propagación y verificar JWKS publicado.**
   ```bash
   sleep 600  # 10 minutos
   diff -u jwks-before.json <(curl -s "$AUTH_API/.well-known/jwks.json" | jq '.')
   ```
   Asegúrate de que el `kid` nuevo aparezca con estado `next` y que los consumidores críticos (API Gateway, Tenant Service) ya lo hayan descargado.

4. **Promover `next` a `current` y generar nueva `next`.**
   ```bash
   curl -s -X POST "$AUTH_API/admin/rotate-keys" | jq '.'
   curl -s "$AUTH_API/metrics" | grep auth_jwks_rotation_total
   ```
   - Espera confirmación HTTP 200.
   - El contador `auth_jwks_rotation_total` debe incrementarse en 1.
   - En la tabla `auth_signing_keys`, valida que la antigua `current` esté en estado `retiring` y la nueva tenga `promoted_at` reciente.

5. **Revocar credenciales anteriores y comunicar.**
   ```bash
   export AUTH_REDIS_URL="redis://auth-redis.prod.smartedify.internal:6379"
   redis-cli -u "$AUTH_REDIS_URL" --scan --pattern 'refresh:*' | \
     xargs -r -n200 redis-cli -u "$AUTH_REDIS_URL" DEL
   redis-cli -u "$AUTH_REDIS_URL" --scan --pattern 'rotated:*' | \
     xargs -r -n200 redis-cli -u "$AUTH_REDIS_URL" DEL
   kubectl -n auth logs deploy/auth-service | grep "JWKS" | tail -n20
   ```
   Notifica a los servicios consumidores para que invaliden cachés locales y verifiquen la aceptación del nuevo `kid`.

## Validation
- `curl -s "$AUTH_API/.well-known/jwks.json" | jq '.keys[].kid'` → incluye el nuevo `kid` como `current` y mantiene el anterior como `retiring` durante el periodo de gracia.
- Métrica `auth_jwks_keys_total{status="current"}` debe permanecer en `1`, `auth_jwks_keys_total{status="retiring"}` en `1` (temporal) y `auth_jwks_keys_total{status="next"}` en `1` tras la rotación automática del endpoint.
- Ejecuta un flujo de login para confirmar que los tokens se firman con el nuevo `kid`:
  ```bash
  NEW_KID=$(curl -s "$AUTH_API/login" -d '{"email":"ops-check@example.com","password":"<SECRET>"}' | jq -r '.access_token' | cut -d'.' -f2 | base64 -d | jq -r '.kid')
  ```
  Debe coincidir con la clave `current` registrada.
- **Recuperación exitosa:** No deben generarse nuevas alertas de autenticación ni errores de validación de tokens en los dashboards de monitoreo durante al menos 15 minutos tras la rotación.

### Verificación continua (cada 15 minutos)
1. Automatiza un chequeo `cron` que ejecute:
   ```bash
   curl -fsS "$AUTH_API/.well-known/jwks.json" | jq -r '.keys[] | "\(.kid),\(.status)"' > /tmp/jwks-status.csv
   curl -fsS "$AUTH_API/metrics" | grep -E 'auth_jwks_keys_total|auth_token_revoked_total|auth_login_success_total' > /tmp/jwks-metrics.log
   ```
   El *job* debe alertar si falta un `kid` en estado `current` o si desaparece la clave `retiring` antes de tiempo.
2. Supervisa en Grafana el tablero **Auth Service · Métricas de negocio**:
   - Panel `Rotación JWKS`: tendencia de `auth_jwks_rotation_total` y edad de la clave `current`.
   - Panel `Tokens revocados`: rate de `auth_token_revoked_total{type="access"}` y `auth_token_revoked_total{type="refresh"}`.
3. Mantén habilitada la alerta `AuthJWKSRotationMissingNext` (Prometheus) que dispara si `auth_jwks_keys_total{status="next"} == 0` durante más de 10 minutos.
4. Documenta resultados en el ticket de rotación y adjunta capturas del dashboard tras las primeras 2 ejecuciones.

## Rollback
1. Identifica el `kid` previo (estado `retiring`) y regístralo en el ticket del incidente.
2. Invoca la API de revocación por clave para invalidar sesiones activas firmadas con la clave comprometida:
   ```bash
   curl -XPOST "$AUTH_API/admin/revoke-kid" -H "Content-Type: application/json" -d '{"kid":"<KID_COMPROMETIDO>"}' | jq
   ```
   El payload de respuesta incluye el número de sesiones invalidadas.
3. Restituye el estado en la base de datos si necesitas volver a promover la clave anterior:
   ```bash
   psql "$AUTH_DB_URL" <<SQL
   UPDATE auth_signing_keys SET status='current', promoted_at=NOW() WHERE kid='<KID_RETIRING>';
   UPDATE auth_signing_keys SET status='retiring', retiring_at=NOW() WHERE kid='<KID_NUEVO>';
   DELETE FROM auth_signing_keys WHERE status='next' AND kid <> '<KID_RETIRING>';
   SQL
   ```
4. Ejecuta `POST /admin/rotate-keys` para regenerar una nueva clave `next` segura una vez contenida la incidencia.
5. Monitorea la alerta `AuthKidRevokedSessions` (cubre spikes de `auth_token_revoked_total`) y confirma que las métricas de login se estabilizan.
6. Regenera *refresh tokens* afectados (flujo login forzado) y comunica al equipo de seguridad el rollback ejecutado con enlace al ticket de seguimiento.

## Escenarios de fallback KMS / Secrets Manager
Cuando el KMS o el Secrets Manager no están disponibles o presentan latencia elevada, seguir los siguientes caminos controlados:

1. **Diagnóstico rápido (5 minutos):**
   - Ejecutar `aws kms describe-key --key-id <ARN>` o equivalente GCP/Azure desde dos regiones distintas.
   - Revisar dashboard `KMS Latency` en Grafana y canal `#cloud-status` para incidentes globales.
   - Consultar *status page* del proveedor (AWS/GCP/Azure) y abrir ticket interno `INC-<fecha>-KMS`.
2. **Fallback de lectura (recuperar claves existentes):**
   - Usar el *vault* local cifrado (`/secure/vault/auth-service.enc`) almacenado en S3 con acceso break-glass.
   - Solicitar aprobación dual (SRE + Seguridad) antes de descargarlo.
   - Desencriptar con `sops -d secure/vault/auth-service.enc > /tmp/auth-keys.json` y cargar manualmente la clave en base de datos (`status='current'`/`'next'`).
3. **Fallback de generación de claves sin KMS:**
   - Generar clave RSA 2048 con `openssl` en estación segura (sin historia shell, `HISTCONTROL=ignorespace`).
   - Cifrar la clave privada con AES-256 local (`openssl enc -aes-256-cbc -salt -in next-private.pem -out next-private.pem.enc`).
   - Registrar en ticket la contraseña temporal utilizada y almacenarla en *sealed secret* manual (Kubernetes) hasta restablecer KMS.
   - Una vez restablecido KMS, reimportar la clave siguiendo flujo estándar (`getNextKey(true)`), eliminar la clave temporal y rotar credenciales que hayan sido expuestas manualmente.
4. **Protección de secretos de aplicación:**
   - Si AWS Secrets Manager está afectado, utilizar caché local (`/var/run/secrets/auth-service/*.json`) que se sincroniza cada 15 minutos; confirmar timestamp < 30 min.
   - En caso de expiración, inyectar configuración desde `configmaps` de respaldo (`auth-service-secrets-backup`) y establecer TTL < 12 h.
   - Documentar cada secreto recuperado manualmente, responsable y hora, y programar rotación forzada cuando el servicio vuelva.
5. **Cierre:**
   - Ejecutar `postmortem` corto con seguridad y plataforma, enumerando claves expuestas, rotaciones pendientes y limpieza de archivos temporales (`shred`, `srm`).
   - Actualizar `docs/status.md` con el incidente y acciones permanentes adoptadas.

## Plan de entrenamiento on-call
1. **Handover semanal:** lunes 09:00 con revisión de métricas JWKS, incidentes de la semana anterior y estado de automatizaciones.
2. **Simulacros mensuales:**
   - Semana 1: ejercicio de rotación programada sin incidentes (dry-run en staging) ejecutado por la persona on-call con supervisión.
   - Semana 3: *Game Day* simulando caída de KMS/Secrets Manager utilizando el procedimiento de fallback descrito arriba.
   - Documentar métricas (`MTTR`, pasos manuales, gaps) y actualizar runbook al final de cada simulacro.
3. **Checklist pre-turno:**
   - Accesos vigentes a: Kubernetes prod/staging, base de datos `auth_service`, herramientas KMS/Secrets Manager.
   - Revise credenciales de break-glass en `1Password` corporativo y confirme contacto de respaldo.
   - Validar que los scripts `deploy.sh`, `smoke-test.sh` y `cosign` están instalados en la estación on-call.
4. **Post-turno (retroalimentación):**
   - Completar formulario `On-call Handoff` en Notion con: incidentes atendidos, pasos manuales y recomendaciones.
   - Programar sesión de repaso si se detectaron pasos no documentados o dudas.
5. **Capacitación continua:**
   - Cada nuevo integrante debe completar laboratorio guiado (`jwks-rotation-workshop.md`) y repasar este runbook con un miembro senior.
   - Registrar fecha de última capacitación en el inventario on-call y alertar si > 90 días.

## Contacts
- **On-call Seguridad**: `#sec-oncall` / security@smartedify.com
- **Equipo Auth Service**: auth-team@smartedify.com (propietarios del servicio y esquema)
- **SRE Plataforma**: `#oncall-plataforma` para soporte en despliegue y métricas
