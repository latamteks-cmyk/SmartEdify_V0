## Resumen Ejecutivo
Este documento describe el estado ACTUAL del Auth Service (MVP reforzado) y su posición tras la decisión de separar la **gobernanza multi-tenant (unidades, delegaciones, unicidad admin)** en un **Tenant Service** dedicado (ver `analisis.md`). Se prioriza: hashing seguro, emisión / rotación básica de tokens, protección brute force, recuperación de contraseña y observabilidad técnica inicial. El Auth Service NO gestionará transferencias de administración ni delegaciones; sólo identidad y tokens.

## Alcance Implementado (MVP actual)
- Endpoints REST: `/register`, `/login`, `/logout`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/roles`, `/permissions`, `/health`, `/metrics`, `/.well-known/jwks.json`, `/admin/rotate-keys` (pendiente endurecer auth) y `/debug/current-kid` (solo dev/test).
- Seguridad: Argon2id (cost diferenciado por entorno), JWT access + refresh con rotación asimétrica (`auth_signing_keys`), rate limiting + brute force guard por combinación email+IP y detección de reuse (`auth_refresh_reuse_blocked_total`).
- Recuperación de contraseña: token con namespace dedicado en Redis y fallback in-memory durante pruebas.
- Observabilidad: logging estructurado (pino + pino-http), métricas técnicas y de negocio (login/reset/refresh, JWKS) y tracing OTel (auto-instrumentación HTTP/Express/PG).
- Pruebas: suite integración estable (10/10) con Redis mock compartido, `global-setup` que aplica migraciones y reducción de coste Argon2 para evitar timeouts.

## No Implementado Aún (Backlog Clave)
- Flujos OIDC extendidos (`/oauth/authorize`, `/.well-known/openid-configuration`, introspect, revoke, userinfo`).
- Protección y automatización del endpoint `/admin/rotate-keys` (auth, cron, expiración `retiring→expired`, alertas).
- Outbox + eventos (`user.registered`, `password.changed`) y consumidores en User/Tenant.
- Redacción de PII/tokens en logs y métricas de saturación (pool PG, Redis, cache JWKS).
- MFA (TOTP / WebAuthn) y step-up auth.
- Gestión criptográfica con KMS/HSM y policies `kid` por entorno.
- Integración contextual enriquecida con Tenant Service (`tenant_ctx_version`, roles dinámicos) y cache L1.

## Arquitectura Lógica (Estado Actual + Integración Tenant Context)
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

## Decisiones Técnicas Principales
| Tema | Decisión | Justificación | Riesgo | Mitigación |
|------|----------|---------------|--------|------------|
| Hashing | Argon2id con parámetros reducidos en test | Velocidad de test y robustez en prod | Divergencia parámetros | Documentar y validar en pre-prod |
| Tokens | JWT access + refresh rotación básica | MVP rápido y seguro sin OAuth completo | Falta revoke granular y reuse detection | Iterar añadiendo tracking + reuse detector |
| Claims contexto | Minimizar payload (sin unidades) | Evitar inflar JWT y riesgos de fuga | Necesidad de datos de gobernanza en tiempo real | Versión de contexto + fetch diferido Tenant Service |
| Rate limiting | email+IP + ventana fija | Minimiza brute force inmediato | No considera device fingerprint | Extender a bucket distribuido y device binding |
| Password reset | Namespace tokens + fallback memoria en test | Aislar colisiones y hacer pruebas deterministas | Fuga si fallback se usa en prod accidentalmente | Guard rails por `NODE_ENV` |
| Logging | pino + desactivación pino-http en tests | Evitar símbolos/log noise en mocks | Pérdida de algunos metadatos en test | Añadir logger wrapper en futuro |
| Métricas | Sólo HTTP genéricas | Minimizar tiempo inicial | Sin métricas negocio para alertas | Añadir counters negocio + SLO |

## Flujos Implementados
### Registro (Separado de Gobernanza)
1. Validación de payload (DTO). 2. Hash Argon2id. 3. Inserción usuario (email unique). 4. Respuesta sin exponer hash.

### Login (Enriquecimiento Opcional de Contexto)
1. Búsqueda usuario por email. 2. Verifica hash Argon2id. 3. Emite access_token (JWT) + refresh_token (cadena opaca o JWT según implementación interna). 4. Aplica rate limiting + guard si fallos sucesivos.

### Refresh
- Verifica refresh token y emite nuevo par. Versión actual: invalida anterior de forma básica (no reuse detection sofisticada todavía). Si la versión de contexto (`tenant_ctx_version`) cambia (futuro), se reconsultará el endpoint de Tenant Service.

### Forgot / Reset Password
1. Forgot: genera token (Redis namespace). En test se guarda además en memoria para acceso directo del test.
2. Reset: valida token, vuelve a hashear password, actualiza registro y consume token (elimina/invalidación).

## Modelo de Datos (Actual)
Tablas base: `users`, `user_roles`, `audit_security` (extendible). Pendientes: tablas de sesiones, refresh token tracking avanzado, revocation list.

## Observabilidad
- Métricas técnicas: request counter + histogram duración.
- Métricas negocio implementadas: `auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_requested_total`, `auth_password_reset_completed_total`, `auth_refresh_rotated_total`, `auth_refresh_reuse_blocked_total`.
- Logs estructurados JSON (correlación con `x-request-id`).
- Próximo: tracing OTel y métricas de saturación (pool conexiones DB, latencias Redis, errores Argon2).

## Seguridad Implementada
- Hashing Argon2id con parámetros endurecidos para producción (cost test reducido).
- JWT firmados con claves RSA en `auth_signing_keys` (estados `current/next/retiring`), JWKS público y métricas `auth_jwks_*`.
- Separación de access vs refresh (TTL distinto), detección de reuse (`auth_refresh_reuse_blocked_total`) y revocación al rotar.
- Rate limiting y guard brute force por combinación email/IP, con métricas para monitorear bloqueos.
- Tokens reset password aislados y de un solo uso con TTL configurable.

## Riesgos y Próximas Mitigaciones
| Riesgo | Impacto | Mitigación próxima | Prioridad |
|--------|---------|--------------------|-----------|
| Endpoint `/admin/rotate-keys` sin autenticación ni cron | Rotación manual susceptible a abuso/omisión | Añadir auth administrativa + job programado + alertas JWKS | Alta |
| Outbox ausente (`user.registered`, `password.changed`) | Falta sincronización con User/Tenant | Implementar outbox + pruebas integración | Alta |
| Logs sin redacción de tokens | Riesgo de exposición PII/tokens | Configurar `pino` con redaction + revisar sinks | Media |
| Falta MFA | Riesgo de takeover si credenciales robadas | Diseñar roadmap TOTP/WebAuthn tras cerrar JWKS/outbox | Media |
| Integración `tenant_ctx_version` pendiente | Claims pueden quedar obsoletos | Coordinar con Tenant para cache/invalidación | Media |

## Backlog Priorizado (Top 8 Actualizado)
1. Proteger `/admin/rotate-keys` y automatizar rotación (cron + alertas `auth_jwks_keys_total`).
2. Publicar OpenAPI + contract tests (Spectral + snapshots) y pipeline CI correspondiente.
3. Implementar outbox + eventos (`user.registered`, `password.changed`) con pruebas de integración.
4. Redactar PII/tokens en logs y exponer métricas de saturación (pool PG, Redis, JWKS cache).
5. Integrar `tenant_ctx_version` en tokens y coordinar cache/invalidación con Tenant Service.
6. Diseñar y ejecutar roadmap MFA (TOTP/WebAuthn) tras estabilizar JWKS/outbox.
7. Evaluar uso de KMS/HSM para firma JWT y rotación por entorno.
8. Publicar alertas SLO (latencia login p95, tasa de fallos, reuse detectado) en Grafana/Alertmanager.

## Roadmap Técnico Incremental (próximos hitos)
- Semana 1: proteger `/admin/rotate-keys`, cron de rotación automática y métricas/alertas JWKS.
- Semana 2: publicar OpenAPI + contract tests (Spectral + snapshots) e integrar pipeline CI.
- Semana 3: implementar outbox (`user.registered`, `password.changed`) + consumer User Service; redactar logs.
- Semana 4: integrar `tenant_ctx_version` en tokens, preparar ADR MFA y plan KMS/HSM.

## Referencias
* `docs/architecture/overview.md` (estado global servicios y flujo creación usuario).
* `PDR_AUTH.md` (visión completa OIDC futura, no confundirse con alcance actual).
* `analisis.md` (decisión de separar gobernanza a Tenant Service).
* `incorporacion.md` (adaptación pendiente para reflejar separación).

---
Documento vivo. Actualizar al cerrar cada milestone de backlog.

