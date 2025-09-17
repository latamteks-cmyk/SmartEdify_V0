# Auth Service

> Referencia arquitectónica general: ver [Documento Rector de Arquitectura](../../../ARCHITECTURE.md). Para el flujo detallado de recuperación de contraseña consulta [Password Reset](../../../docs/auth/password-reset.md).

## Visión y alcance actual
Este servicio cubre la autenticación central de SmartEdify tras separar la gobernanza multi-tenant en un Tenant Service dedicado. El MVP reforzado prioriza hashing seguro, emisión y rotación básica de tokens, protección contra fuerza bruta, recuperación de contraseña y observabilidad inicial. No gestiona delegaciones ni traspasos de administración; se enfoca en identidad, sesiones y tokens.

### Alcance implementado (estado actual)
- Endpoints REST: `/register`, `/login`, `/logout`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/roles`, `/permissions`, `/health`, `/metrics`, `/.well-known/jwks.json`, `/admin/rotate-keys` (MVP sin auth dura para rotación manual).
- Seguridad: Argon2id (costos diferenciados por entorno), JWT RS256 (access + refresh) con rotación de claves (estados `current|next|retiring`), rotación de refresh tokens single-use y detección básica de reuso bloqueando la cadena inmediata.
- Recuperación de contraseña: tokens de un solo uso namespaced, residentes en almacenamiento simulado (mock Redis) + métrica de solicitudes y completados.
- Observabilidad: logging estructurado (`pino`), métricas técnicas HTTP + contadores de negocio/seguridad, health check lógico (en modo test mockea Postgres/Redis para aislamiento reproducible), JWKS publicado.
- Pruebas: suite unificada (47 tests) aislada de infraestructura física mediante mocks de DB (`__mocks__/pg.adapter.ts`) y Redis; incluye flujos end-to-end de registro, login, refresh, rotación de claves y password reset.
- Logout: revoca refresh token activo y niega reuso subsecuente; incrementa métricas de revocación.
- Registro: asigna rol base (`user`) y refleja roles efectivos en respuesta y claims del JWT.

### Backlog clave (pendiente)
- Flujos OIDC completos: `authorize`, `token`, `userinfo`, `jwks`, `introspection`, `revocation`, discovery.
- Detección avanzada de reuse de refresh tokens y revocación por cadena.
- MFA (TOTP/WebAuthn) con step-up y claim `amr`.
- Outbox de eventos (`user.registered`, `password.changed`) y métricas de negocio.
- Tracing OTel (HTTP + DB) y métricas de saturación.
- Gestión criptográfica con rotación de llaves vía KMS/HSM.
- Integración contextual ligera con Tenant Service (`/tenant-context`).

### Visión futura OIDC
- Tokens alineados a OAuth2/OIDC: Authorization Code + PKCE (web/móvil) y Client Credentials (M2M).
- Firmas asimétricas (RS256/ES256) con rotación JWKS cada 90 días y doble publicación.
- Gestión de sesiones en Redis, reuse detection estricta y revocación por usuario, cliente o tenant.
- MFA (TOTP/WebAuthn) con `amr`/`acr`, step-up basado en scopes sensibles y device binding opcional.
- Auditoría de eventos de seguridad y métricas: `auth_login_total`, `token_issued_total`, `refresh_reuse_detected_total`, etc.

## Ejecución local
1. Instala dependencias y configura variables de entorno usando `.env.example`.
2. Compila (opcional) `npm run build`.
3. Ejecuta en modo desarrollo: `npm run dev`.
4. Ejecuta la suite de pruebas: `npm test -- --runInBand`.
5. Opcional: generar reporte de cobertura `npm test -- --coverage`.

## Variables de entorno (parcial)
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `AUTH_PORT` | Puerto de escucha HTTP | `8080` |
| `AUTH_LOG_LEVEL` | Nivel de log (`info`, `warn`, `error`, `debug`) | `info` |
| `AUTH_JWT_ACCESS_TTL` | TTL del access token | `900s` |
| `AUTH_JWT_REFRESH_TTL` | TTL del refresh token | `30d` |
| `AUTH_JWT_ACCESS_SECRET` | Clave simétrica fallback (solo si no RS256) | — |
| `AUTH_JWT_REFRESH_SECRET` | Clave simétrica fallback | — |
| `AUTH_TEST_LOGS` | Si está definido, habilita logs adicionales en tests | `1` |
| `DEBUG_REFRESH` | Traza extendida de rotación de refresh tokens | `1` |
| `AUTH_RATE_LIMIT_WINDOW` | Ventana rate limit (ms) | `60000` |
| `AUTH_RATE_LIMIT_MAX` | Máximo solicitudes ventana/email+IP | `10` |
| `NODE_ENV` | Entorno (`development|test|production`) | `test` |

> Nota: En modo test se ignoran credenciales reales de Postgres/Redis porque se usan mocks en memoria; para producción deberán definirse URLs reales.

## Endpoints principales
- GET `/authorize`
- POST `/token`
- GET `/userinfo`
- POST `/introspection`
- POST `/revocation`
- GET `/.well-known/openid-configuration`
- POST `/register`
- POST `/login`
- POST `/logout`
- POST `/forgot-password`
- POST `/reset-password`
- GET `/roles` (acepta `tenantId` opcional)
- GET `/permissions` (acepta `tenantId` y `role` opcionales)

## Arquitectura lógica
```mermaid
flowchart LR
        Client[Cliente Web/App] --> API[Auth API]
        API --> HandlerLogin[Login Handler]
        API --> HandlerRegister[Register Handler]
        API --> HandlerRefresh[Refresh Handler]
        API --> HandlerForgot[Forgot Password]
        API --> HandlerReset[Reset Password]
        API --> Metrics[/metrics]
        subgraph Core
                Security[JWT + Hashing]
                Tokens[Emisión / Rotación]
        end
        API --> Core
        Core --> PG[(Postgres)]
        Core --> Redis[(Redis)]

subgraph Context
    TenantSvc[(Tenant Service)] --> CtxAPI[/tenant-context]
end
HandlerLogin --> CtxAPI
HandlerRefresh --> CtxAPI
```

## Decisiones técnicas
| Tema | Decisión | Justificación | Riesgo | Mitigación |
| ---- | -------- | ------------- | ------ | ---------- |
| Hashing | Argon2id con parámetros reducidos en test | Balancea seguridad en producción y velocidad en CI | Divergencia de parámetros | Validar configuraciones antes de releases |
| Tokens | JWT access + refresh con rotación básica | Permite MVP seguro sin OAuth2 completo | Reuse detection limitada | Extender con tracking de sesiones y revocación | 
| Claims de contexto | Payload mínimo, delegando gobernanza al Tenant Service | Evita inflar JWT y exposición de datos sensibles | Necesidad de datos de gobernanza en tiempo real | Mantener versión de contexto y fetch diferido |
| Rate limiting | Guard por email + IP con ventana fija | Mitiga ataques de fuerza bruta simples | No considera fingerprint de dispositivo | Evolucionar a bucket distribuido + device binding |
| Password reset | Tokens namespaced en Redis + fallback en memoria (solo test) | Aísla colisiones y facilita pruebas | Riesgo si fallback se usa fuera de test | Guard rails por `NODE_ENV` |
| Logging | `pino` con configuración reducida en test | Logs estructurados sin ruido en CI | Pérdida de algunos metadatos durante pruebas | Añadir wrapper/formatter cuando sea necesario |
| Métricas | HTTP genéricas + contadores negocio iniciales | Visibilidad rápida del MVP | Sin métricas avanzadas de seguridad | Instrumentar métricas específicas en backlog |

## Flujos implementados
- Registro de usuario: validación, hash Argon2id, rol base, retorno de claims mínimos.
- Login: emisión access/refresh RS256 con `kid`, rate limiting contextual (email+IP) y preparación para OIDC futuro.
- Refresh: rotación single-use (nuevo refresh invalida al anterior) con bloqueo de reuso inmediato.
- Recuperación de contraseña: emisión token de un solo uso + invalidación tras consumo; métricas de solicitud y completado.
- Rotación manual de claves: árbol de estados `current -> retiring -> expired (pendiente)` + promoción de `next` y generación de nueva `next`.
- Logout: revocación refresh activo + incremento de métrica de revocación.
- Publicación JWKS: claves `current`, `next`, `retiring` visibles para validadores externos.

### Flujo de Password Reset (detalle resumido)
1. Usuario solicita `/forgot-password` con email registrado.
2. Se genera token (UUID v4) namespaced (`pwdreset:${userId}:${jti}`) con TTL.
3. (MVP) El token se expone en respuesta directa SOLO en entorno test; en producción sería enviado vía correo seguro.
4. Cliente llama `/reset-password` con `token` + nueva contraseña.
5. Validación: existencia, vigencia (TTL), no consumo previo, formato.
6. Hash Argon2id nuevo, invalidación del token, métricas incrementadas.

Seguridad:
- Token de un único uso.
- Namespacing evita colisiones con otros flujos.
- No se filtra si el email existe (respuesta homogénea en forgot).
- Métricas permiten detectar patrones anómalos de solicitudes.

Errores típicos (HTTP 400/404/410): token inválido, expirado, ya usado.

Documento ampliado: [Flujo Password Reset — detalle](../../../docs/auth/password-reset.md).

### Validación cruzada con User Service
- Cliente HTTP con `fetch` nativo, timeouts configurables y reintentos exponenciales cortos.
- `AUTH_USER_SERVICE_MODE=mock` permite aislar pruebas; `http` ejecuta POST `AUTH_USER_SERVICE_VALIDATE_PATH`.
- En producción se debe fijar `AUTH_USER_SERVICE_MODE=http` junto a `AUTH_USER_SERVICE_URL`; si falta la URL o se fuerza `mock` el servicio falla en el arranque para evitar mocks accidentales.
- El cliente propaga `roles`, `permissions` y `status` devueltos por el User Service y los persiste durante el registro.
- `bypass` fuerza aprobación (útil en entornos de contingencia controlados).

### Ejemplo Authorization Code + PKCE
1. **Redirección inicial** (requiere un access token válido del usuario):
   ```bash
   curl -i -G "http://localhost:8080/authorize" \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     --data-urlencode "response_type=code" \
     --data-urlencode "client_id=squarespace" \
     --data-urlencode "redirect_uri=https://www.smart-edify.com/auth/callback" \
     --data-urlencode "scope=openid profile email offline_access" \
     --data-urlencode "code_challenge=<CODE_CHALLENGE>" \
     --data-urlencode "code_challenge_method=S256"
   ```
   La respuesta devuelve `302` con el parámetro `code` en la URL de callback.

2. **Intercambio de código por tokens**:
   ```bash
   curl -X POST http://localhost:8080/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "code=<CODE_FROM_STEP_1>" \
     -d "redirect_uri=https://www.smart-edify.com/auth/callback" \
     -d "client_id=squarespace" \
     -d "code_verifier=<CODE_VERIFIER>"
   ```
   Respuesta: `access_token`, `refresh_token`, `id_token`, `scope` y `expires_in`.

3. **UserInfo con scopes `profile`/`email`**:
   ```bash
   curl http://localhost:8080/userinfo \
     -H "Authorization: Bearer <ACCESS_TOKEN>"
   ```

4. **Introspección y revocación**:
   ```bash
   curl -X POST http://localhost:8080/introspection \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=squarespace" \
     -d "token=<ACCESS_OR_REFRESH_TOKEN>"

   curl -X POST http://localhost:8080/revocation \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=squarespace" \
     -d "token=<ACCESS_OR_REFRESH_TOKEN>"
   ```

5. **Discovery OIDC**:
   ```bash
   curl http://localhost:8080/.well-known/openid-configuration | jq
   ```

## Observabilidad y seguridad
### Observabilidad
- Métricas HTTP + contadores negocio (`auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_*`, `auth_refresh_rotated_total`, `auth_refresh_reuse_blocked_total`).
- Nueva métrica `auth_token_revoked_total{type}` que incrementa en flujos de logout o revocación explícita.
- Logs JSON estructurados con correlación `x-request-id`.
- Próximo paso: tracing OTel y métricas de saturación (pool DB, latencia Redis, coste Argon2).

### Seguridad
- Hashing Argon2id endurecido en producción y reducido en test.
- JWT firmados (clave estática MVP) con planes de rotación KMS.
- Rate limiting y guard anti fuerza bruta.
- Tokens de recuperación de un solo uso.
- Revocación de refresh tokens vía logout y deny-list corta para access/refresh tokens comprometidos.

## Rotación de Claves JWT (JWKS)
> Procedimiento operacional detallado: [Runbook — Rotación de claves (Auth)](../../../docs/operations/incident-auth-key-rotation.md).

Se implementó un almacén de claves rotativas en la tabla `auth_signing_keys` con estados `current`, `next`, `retiring`, `expired`.

Endpoints:
- `GET /.well-known/jwks.json` devuelve claves públicas activas (`current`, `next`, `retiring`).
- `POST /admin/rotate-keys` fuerza rotación manual (requiere credencial administrativa).
- `POST /admin/revoke-kid` invalida sesiones activas firmadas con un `kid` comprometido y marca la clave como revocada (requiere credencial administrativa).

Emisión y verificación de tokens:
- Los access y refresh tokens se firman con `RS256` usando la clave `current` e incluyen `kid`.
- La verificación realiza lookup por `kid` y valida contra la clave pública (`pem_public`).
- Fallback: si se definen `AUTH_JWT_ACCESS_SECRET` / `AUTH_JWT_REFRESH_SECRET` y el token no trae `kid`, se intenta validar simétricamente.

Rotación manual (flujo MVP):
1. `current` pasa a `retiring`.
2. `next` se promueve a `current`.
3. Se genera una nueva `next`.

Métricas expuestas:
- `auth_jwks_keys_total{status}` gauge de número de claves por estado.
- `auth_jwks_rotation_total` contador de rotaciones manuales.

Formato JWKS:
- Se expone en formato estándar: cada clave incluye `kty`, `n`, `e`, `alg`, `use`, `kid`, `status`.

Limitaciones pendientes:
- No hay job que marque `retiring -> expired` tras periodo de gracia.
- Pendiente migrar a mecanismo de autenticación mutua (mTLS / IAM) para el endpoint administrativo.
- Faltan alertas sobre ausencia de `next` o edad excesiva de `current`.

### Validación automatizada
- `tests/security/keys.test.ts` fuerza `rotateKeys()` y comprueba que la clave anterior queda marcada como `retiring` (incluyendo la marca `retiring_at`) y que el JWKS expone entradas para `current`, `next` y `retiring` con los `kid` esperados.
- `tests/security/jwt.test.ts` redefine temporalmente `AUTH_JWT_ACCESS_TTL=5s` y `AUTH_JWT_REFRESH_TTL=10s`, mockea el reloj para provocar `TokenExpiredError` y verifica que existe tolerancia al clock-skew mientras el desfase permanezca dentro del TTL.

### Operaciones administrativas protegidas

- Establece `AUTH_ADMIN_API_KEY` con una credencial segura (idealmente inyectada vía secret manager).
- Opcionalmente redefine el header esperado mediante `AUTH_ADMIN_API_HEADER` (por defecto `x-admin-api-key`).
- Solicitudes sin credencial retornan `401`, credenciales inválidas `403` y una credencial válida permite el flujo (`200`).

Pruebas locales rápidas:
```bash
curl -s http://localhost:8080/.well-known/jwks.json | jq
curl -XPOST http://localhost:8080/admin/rotate-keys -H "X-Admin-Api-Key: $AUTH_ADMIN_API_KEY"
```

## Métricas (Prometheus)
| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `auth_login_success_total` | Counter | `method` | Logins exitosos |
| `auth_login_fail_total` | Counter | `reason` | Intentos fallidos (credenciales, bloqueo) |
| `auth_refresh_rotated_total` | Counter | `reason` | Rotaciones de refresh válidas |
| `auth_refresh_reuse_blocked_total` | Counter | `phase` | Intentos de reuso bloqueados |
| `auth_password_reset_requested_total` | Counter | - | Solicitudes de reset iniciadas |
| `auth_password_reset_completed_total` | Counter | - | Resets finalizados exitosamente |
| `auth_token_revoked_total` | Counter | `type` | Revocaciones de tokens (logout, rotación) |
| `auth_jwks_keys_total` | Gauge | `status` | Conteo de claves por estado (`current|next|retiring`) |
| `auth_jwks_rotation_total` | Counter | - | Rotaciones manuales de claves |
| `http_requests_total` | Counter | `route,method,status` | Tráfico HTTP (básico) |
| `http_request_duration_seconds` | Histogram | `route,method` | Latencia por ruta |

> Consultar en `/metrics`. Ejemplo: `curl -s http://localhost:8080/metrics | grep auth_password_reset`.

## Mocks y Aislamiento de Infraestructura
- `__mocks__/pg.adapter.ts`: simula operaciones mínimas de usuarios, roles y claves de firma.
- Redis: mock in-memory para namespaces de tokens (refresh, password reset) y rate limiting.
- Beneficios: ejecución determinista en CI, velocidad, sin dependencias de contenedores.
- Limitación: no valida SQL real ni tiempos de red; pruebas de integración “reales” se desplazarán a una futura pipeline E2E.

### Convenciones de pruebas
- Directorios: `tests/unit`, `tests/integration`, `tests/security` (actualmente todos aislados por mocks de DB/Redis).
- Nomenclatura: `<feature>.test.ts` (unit), `<feature>.integration.test.ts` (flujo compuesto), `<aspect>.metrics.test.ts` (validación de métricas).
- Tests duplicados se consolidan; política: eliminar físicamente archivos legacy tras migrar.
- Conteo actual: 47 tests (18 suites) después de consolidar forgot/reset.

## Roadmap corto (tests y calidad)
1. Añadir expiración simulada de tokens de refresh para escenarios de borde.
2. Instrumentar detection avanzada de reuse (árbol de cadena) + métricas.
3. Introducir contract tests generados desde OpenAPI.
4. Extraer lógica de handlers a servicios puros para elevar cobertura unitaria.
5. Añadir tracing OTel (spans de login, refresh, reset, rotate-keys).

## Estrategia de pruebas
### Niveles de prueba
| Nivel | Estado actual | Cobertura objetivo | Notas |
| ----- | ------------- | ------------------ | ----- |
| Unit | Parcial (helpers hashing/jwt aún acoplados a handlers) | ≥ 70 % en etapa T1 | Extraer lógica a `internal/app` para aislar |
| Integración | Suite verde (10 casos) | Mantener y ampliar | Cubre register, login, refresh, forgot/reset |
| Contrato | No implementado | Definir tras publicar OpenAPI | Usar Prism / Schemathesis |
| E2E (gateway) | No disponible | Planificado tras OIDC completo | Validar JWT en gateway |
| Seguridad | Manual ad-hoc | Automatizar checks | Añadir gitleaks, `npm audit`, brute-force guard |

### Flujos cubiertos en integración
- Registro nuevo usuario (email único).
- Login correcto y fallido (password errónea con rate limiting progresivo).
- Rotación básica de refresh token.
- Recuperación de contraseña end-to-end.
- Logout con revocación de refresh token y deny-list.

### Flujos pendientes
- Detección de reuse de refresh tokens.
- Expiración y rechazo de refresh/token.
- Extender logout para revocación en cadena y dispositivos múltiples.
- Auditoría de eventos de seguridad y MFA.

### Datos de prueba y aislamiento
- Emails dinámicos por test (`test-${timestamp}@example.com`).
- Password fija con complejidad adecuada.
- Captura de tokens reset mediante fallback in-memory (solo test).
- Mocks compartidos de Redis (`__mocks__/ioredis`) y coste Argon2 reducido.

### Métricas y calidad
- Incorporar `tests_total`, `tests_failed_total` en CI.
- Gate de cobertura incremental (> 70 % T1, > 80 % T2).
- Histórico de duración de suite para detectar regresiones (> 20 %).

### Seguridad (checks automatizables)
- Dependencias vulnerables: `npm audit` / Trivy FS.
- Secret scanning: Gitleaks.
- Lint de seguridad (regex tokens).
- Test negativo de rotación refresh.

### Plan incremental
1. Instrumentar reuse detection y pruebas negativas.
2. Extraer lógica a servicios (`internal/app`) para habilitar unit tests puros.
3. Generar OpenAPI stub y activar tests de contrato.
4. Añadir métricas negocio y alertas.
5. Simular expiraciones mediante overrides de tiempo.

### Riesgos QA actuales
| Riesgo | Impacto | Mitigación |
| ------ | ------- | ---------- |
| Lógica de negocio mezclada en handlers | Dificulta unit tests | Refactor hacia capa de servicios |
| Sin coverage report | Regresiones sin visibilidad | Ejecutar `jest --coverage` y publicar en CI |
| Falta error paths en pruebas | Riesgo de falsos positivos | Añadir casos negativos: usuario inexistente, token corrupto/expirado |
| Sin pruebas de carga | Desconocimiento de p95 bajo estrés | Integrar k6/gatling tras estabilizar API |

### Guía práctica
#### Estructura de carpetas de pruebas
```
tests/
  unit/           # Pruebas unitarias sobre handlers y lógica
  integration/    # Flujo end-to-end (requiere Postgres/Redis reales)
  security/       # Pruebas aisladas JWKS/JWT con mocks de pg.adapter & ioredis
  jest.setup.ts   # Configuración adicional (matchers, etc.)
  global-setup.ts # Aplica migraciones si faltan tablas antes de correr tests
  global-teardown.ts # Cierra recursos
```

#### Entorno controlado (.env.test)
Se usa `.env.test` para definir puertos/credenciales específicos de pruebas. Si la tabla `users` no existe, el `global-setup` ejecuta `npm run migrate` (carpeta `migrations_clean`).

Variables mínimas recomendadas en `.env.test`:
```
PGHOST=localhost
PGPORT=5542
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=smartedify
REDIS_HOST=localhost
REDIS_PORT=6639
AUTH_JWT_ACCESS_TTL=900s
AUTH_JWT_REFRESH_TTL=30d
NODE_ENV=test
```

#### Comandos
Ejecutar toda la suite:
```powershell
npm test -- --runInBand
```

Sólo pruebas de seguridad (mocks, rápido):
```powershell
npm test -- --runInBand tests/security
```

Sólo unitarias:
```powershell
npm test -- tests/unit
```

Flujos críticos RBAC (`authorize`/`token`/`introspection`/`revocation`):
```powershell
npm run test:rbac
```
Ejecuta la validación end-to-end contra Postgres real (stage `integration`) y revalida los contratos HTTP (stage `contract`) para bloquear regresiones de scopes/roles.

#### Mocks
- `tests/security/*` mockean `../../internal/adapters/db/pg.adapter` e `ioredis` para evitar dependencias externas.
- Los mocks se declaran dentro de cada archivo para no interferir con el resto de la suite.

#### Diagnóstico de handles abiertos
Si Jest no termina (mensaje de open handles):
```powershell
npm test -- --runInBand --detectOpenHandles
```

#### Estrategia de rotación cubierta en tests
- Generación de clave inicial (`current`).
- Creación automática de `next`.
- Promoción en rotación y generación de nueva `next`.
- Construcción del JWKS (formato JWK estándar).
- Emisión y verificación de access/refresh tokens (RS256 + `kid`).
- Rotación de refresh token evitando reuso.

#### Futuras mejoras de pruebas
- Añadir job simulado para estado `retiring -> expired`.
- Tests de performance de firma/verificación.
- Tests de resiliencia ante pérdida de cache local de claves.

### Riesgos y mitigaciones del servicio
| Riesgo | Impacto | Mitigación próxima | Prioridad |
| ------ | ------- | ------------------ | --------- |
| Falta reuse detection de refresh | Escalada de sesión ante token robado | Implementar almacenamiento de estado y cadena de JTI | Alta |
| Clave JWT estática | Ventana de compromiso ampliada | Rotación con KMS/HSM | Alta |
| Sin tracing OTel | Dificultad para RCA de latencias | Instrumentar spans HTTP + DB | Media |
| Sin métricas de negocio completas | Alertas insuficientes | Añadir counters y dashboards | Alta |
| Password reset tokens solo en Redis | Falta auditoría y expiración reforzada | Añadir TTL explícito y logging | Media |

### Backlog priorizado
1. Refresh reuse detection (revocación de cadena + tracking de sesiones).
2. Publicar OpenAPI base y contrato versionado.
3. Instrumentar tracing OTel (HTTP/DB).
4. Migraciones para sesiones, tracking de refresh y revocation list.
5. MFA TOTP y claim `amr`.
6. JWKS asimétrico + endpoints OIDC completos.
7. Outbox de eventos de seguridad (`user.registered`, `password.changed`).
8. Alertas SLO (latencia login, error rate, reuse attempts).

## SLO
- Tiempo de respuesta < 300ms
- Disponibilidad > 99.9%

## Contacto equipo
- Equipo Auth: auth-team@smartedify.com
