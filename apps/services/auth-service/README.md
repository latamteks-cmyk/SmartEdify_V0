# Auth Service

> Referencia arquitectónica general: ver [Documento Rector de Arquitectura](../../../ARCHITECTURE.md). Para el flujo detallado de recuperación de contraseña consulta [Password Reset](../../../docs/auth/password-reset.md).

## Visión y alcance actual
Este servicio cubre la autenticación central de SmartEdify tras separar la gobernanza multi-tenant en un Tenant Service dedicado. Se enfoca en **identidad, gestión de sesiones y emisión de tokens**, priorizando la seguridad y la observabilidad.

### Alcance implementado (Estado Real Auditado)
- **Endpoints REST:** `/register`, `/login`, `/logout`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/roles`, `/permissions`, `/health`, `/metrics`, `/.well-known/jwks.json`, y endpoints administrativos como `/admin/rotate-keys`.
- **Seguridad:**
    - **Hashing de Contraseñas:** Se utiliza **Argon2id** con costos de computación diferenciados por entorno (más robusto en producción, más rápido en tests).
    - **Tokens JWT (RS256):**
        - Emisión de `access_token` y `refresh_token` firmados con claves asimétricas.
        - **Rotación de Claves de Firma (JWKS):** Gestión de claves en base de datos con estados (`current`, `next`, `retiring`), permitiendo la rotación sin invalidar tokens inmediatamente. El endpoint `/.well-known/jwks.json` publica las claves públicas para verificación externa.
        - **Rotación de Refresh Tokens (Single-Use):** Cada `refresh_token` es de un solo uso para prevenir ataques de repetición.
        - **Detección de Reutilización de Refresh Tokens:** El servicio invalida cada `refresh_token` después de su uso y bloquea activamente los intentos de reutilización, generando métricas (`auth_refresh_reuse_blocked_total`) para monitorear esta actividad maliciosa.
- **Recuperación de contraseña:** Implementada con tokens de un solo uso gestionados en Redis, asegurando que cada token de reseteo sea invalidado tras su consumo.
- **Observabilidad:**
    - **Logging:** Logging estructurado (JSON) con `pino`, incluyendo un `x-request-id` para facilitar la correlación y el seguimiento de peticiones.
    - **Métricas (Prometheus):** Exposición de métricas clave de negocio, seguridad y operación en el endpoint `/metrics`. Incluye contadores como `auth_login_total`, `auth_password_reset_requested_total`, `auth_refresh_rotated_total`, y `auth_refresh_reuse_blocked_total`.
    - **Tracing Distribuido (OpenTelemetry):** El código está instrumentado con spans de OTel en los handlers HTTP, permitiendo el análisis de latencias y el seguimiento de flujos a través de múltiples servicios.
- **Protección a Nivel de API:**
    - **Rate Limiting:** Se ha implementado un middleware para limitar la tasa de peticiones en endpoints críticos (ej. `/login`, `/forgot-password`), mitigando ataques de fuerza bruta y de enumeración.
- **Pruebas:** El servicio cuenta con una suite de pruebas unitarias y de integración que validan los flujos críticos, utilizando mocks para aislar el entorno de CI/CD de dependencias externas.

### Backlog clave (Pendiente y Priorizado)

| Tarea Pendiente | Prioridad | Justificación del Riesgo |
| --------------- | --------- | ------------------------ |
| **Invalidación de Sesiones Post-Reseteo de Contraseña** | **CRÍTICA** | Un atacante que logra resetear una contraseña podría mantener acceso a sesiones preexistentes del usuario legítimo. Es fundamental revocar todos los `refresh_tokens` activos del usuario. |
| **Clarificación de Gestión de Roles/Permisos** | **ALTA** | La estrategia para asignar y gestionar `claims` complejos (ej. `admin`) no está formalizada, lo que puede llevar a deuda técnica. Debe definirse la autoridad (¿`auth-service` o `tenant-service`?). |
| **Patrón Outbox para Eventos de Seguridad** | **MEDIA** | La publicación de eventos críticos (`user.registered`, `password.changed`) se hace de forma síncrona. Sin el patrón Outbox, un fallo en el broker de mensajería podría causar la pérdida de estos eventos. |
| **Integración con un Gestor de Secretos (KMS/HSM)** | **MEDIA** | Las claves de firma de JWT se gestionan actualmente en la base de datos. Migrarlas a un servicio dedicado como AWS KMS o HashiCorp Vault reduce drásticamente el riesgo de compromiso de claves. |
| **Autenticación Multi-Factor (MFA)** | **MEDIA** | El servicio carece de un segundo factor de autenticación, lo que deja las cuentas vulnerables si las credenciales son robadas. Se debe añadir soporte para TOTP y/o WebAuthn. |
| **Flujos OIDC Completos** | **BAJA** | Para integraciones con clientes de terceros que esperan un comportamiento 100% compatible con OpenID Connect, es necesario completar todos los flujos estándar (`authorize`, `userinfo`, etc.). |


### Visión futura OIDC
- Tokens alineados a OAuth2/OIDC: Authorization Code + PKCE (web/móvil) y Client Credentials (M2M).
- Gestión de sesiones en Redis, reuse detection estricta y revocación por usuario, cliente o tenant.
- MFA (TOTP/WebAuthn) con `amr`/`acr`, step-up basado en scopes sensibles y device binding opcional.
- Auditoría avanzada de eventos de seguridad.

## Ejecución local
1. Instala dependencias y configura variables de entorno usando `.env.example`.
2. Compila (opcional) `npm run build`.
3. Ejecuta en modo desarrollo: `npm run dev`.
4. Ejecuta la suite de pruebas: `npm test -- --runInBand`.

## Variables de entorno (parcial)
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `AUTH_PORT` | Puerto de escucha HTTP | `8080` |
| `AUTH_LOG_LEVEL` | Nivel de log (`info`, `warn`, `error`, `debug`) | `info` |
| `AUTH_JWT_ACCESS_TTL` | TTL del access token | `900s` |
| `AUTH_JWT_REFRESH_TTL` | TTL del refresh token | `30d` |
| `AUTH_LOGIN_WINDOW_MS` | Ventana rate limit login (ms) | `60000` |
| `AUTH_LOGIN_MAX_ATTEMPTS` | Máximo solicitudes ventana/email+IP | `10` |
| `AUTH_ADMIN_API_KEY` | Clave para proteger endpoints administrativos | `una-clave-muy-segura` |
| `NODE_ENV` | Entorno (`development|test|production`) | `development` |

> El resto de variables, incluyendo las de base de datos y Redis, se encuentran en `.env.example`.

## Automatización de rotación JWKS
- La rotación de claves se puede automatizar mediante un workflow de CI/CD (ej. GitHub Actions) que invoque periódicamente el endpoint `POST /admin/rotate-keys` con la credencial administrativa (`AUTH_ADMIN_API_KEY`).
- El job debe validar que el nuevo JWKS publicado en `/.well-known/jwks.json` contiene la nueva clave con estado `current`.
