# Runbook — Rotación de claves (Auth)

## Purpose
Ejecutar una rotación controlada de las claves RSA utilizadas por Auth Service para firmar tokens JWT. El objetivo es mitigar exposiciones, cumplir con políticas de rotación y garantizar que los consumidores actualicen el JWKS sin pérdida de disponibilidad.

## Preconditions
- Hay un motivo válido (compromiso, política de 90 días o auditoría) documentado en el ticket.
- Acceso a la base de datos `auth_service` y al endpoint administrativo `POST /admin/rotate-keys` (expuesto internamente).
- Capacidad para ejecutar comandos `openssl`, `uuidgen` y `psql` desde un entorno seguro.
- Confirmación de que el *cache* y los consumidores aceptan claves en estados `current`, `next` y `retiring`.

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

## Rollback
1. Identifica el `kid` previo (estado `retiring`).
2. Restituye el estado en la base de datos:
   ```bash
   psql "$AUTH_DB_URL" <<SQL
   UPDATE auth_signing_keys SET status='current', promoted_at=NOW() WHERE kid='<KID_RETIRING>'; 
   UPDATE auth_signing_keys SET status='retiring', retiring_at=NOW() WHERE kid='<KID_NUEVO>'; 
   DELETE FROM auth_signing_keys WHERE status='next' AND kid <> '<KID_RETIRING>';
   SQL
   ```
3. Limpia caches aplicando `POST /admin/rotate-keys` para recrear una nueva `next` segura una vez contenido el incidente.
4. Regenera *refresh tokens* afectados y comunica al equipo de seguridad el rollback ejecutado.

## Contacts
- **On-call Seguridad**: `#sec-oncall` / security@smartedify.com
- **Equipo Auth Service**: auth-team@smartedify.com (propietarios del servicio y esquema)
- **SRE Plataforma**: `#oncall-plataforma` para soporte en despliegue y métricas
