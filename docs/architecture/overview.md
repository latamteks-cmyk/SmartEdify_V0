# Arquitectura Backend SmartEdify — Overview

> Última actualización: 2025-09-16. Sustituye al antiguo `docs/spec.md` como fuente única de verdad sobre la arquitectura backend.

## Monorepo y Capas Principales

- **Aplicaciones (`apps/`)**: agrupa ejecutables (web, móvil y microservicios). Estado: Auth y Tenant con código productivo; User y Assembly en fase scaffold.
- **Microservicios (`apps/services/<service>`):** cada servicio debe exponer `cmd/server/main.*` como entrypoint y organizarse en `internal/app`, `internal/domain`, `internal/adapters/{http|repo|bus|ext}`, `internal/config`. Contratos viven en `api/openapi.yaml` y `api/proto/`; las migraciones SQL en `migrations/`; pruebas unitarias e integración en `tests/unit` y `tests/integration`; despliegues en `helm/` y `k8s/`.
- **Librerías compartidas (`packages/`)**: destino para `core-domain`, `security`, `http-kit`, `event-bus`, `persistence`, `validation`, `i18n`, `ui-kit`. *Roadmap:* carpeta aún no creada; mantener dependencias locales hasta consolidar módulos reutilizables.
- **Contratos externos (`api/`)**: OpenAPI y proto compartidos para integraciones externas.
- **Migraciones y seeds (`db/`)**: repositorio centralizado para scripts multiplataforma. *Roadmap:* crear estructura tras estabilizar pipelines por servicio.
- **Infraestructura declarativa (`infra/`)**: terraform, manifiestos Kubernetes, configuración de gateway. *Roadmap:* pendiente creación coordinada con equipo DevOps.
- **Operaciones y runbooks (`ops/`)**: documentación operativa viva (incident response, playbooks). *Roadmap:* parte de la estandarización SRE.
- **Documentación (`docs/`)**: PRD, diseño, API, legal y snapshots ejecutivos.
- **Herramientas internas (`tools/`)**: scripts especializados. *Roadmap:* identificar necesidades tras estabilizar servicios core.
- **Calidad y CI/CD (`.github/`, `Makefile`, `CODEOWNERS`)**: pipelines por servicio, control de commits y revisiones obligatorias.

## Principios Técnicos

### Contratos y Configuración
- Contratos primero: cada cambio en API exige actualizar OpenAPI/Proto, ejemplos y regenerar SDKs.
- Variables de entorno con prefijo por servicio (`AUTH_`, `USER_`, `ASM_`, etc.). Distribuir plantillas `.env.example`.
- Configuración sensible fuera del repositorio; secrets gestionados vía GitHub Secrets/AWS Secrets Manager.

### Seguridad y Cumplimiento
- TLS extremo a extremo; sin secretos en repo; JWT con `aud`, `iss`, `sub`, `tenant_id`, `roles`, `scopes`.
- El gateway centraliza la verificación de JWT; los servicios aplican autorización contextual.
- Imágenes firmadas (cosign) y políticas de admisión (Kyverno: `runAsNonRoot`, `readOnlyRootFilesystem`).
- Logs sin PII y tokens redactados; retención outbox 7 días y DLQ 30 días.

### Persistencia y Datos
- Migraciones versionadas y *forward-only* con plan de rollback documentado.
- Una transacción por caso de uso; índices declarados en migraciones.
- Patrón outbox para eventos externos; *idempotency* por `x-request-id` y `event-id`.

### Testing y Calidad
- Cobertura mínima objetivo: 80% en `internal/app` y dominio.
- Pruebas de contrato para HTTP/gRPC con snapshots sanitizados; migraciones validadas en CI.
- Lint y format en pre-commit; convenciones de commit y CODEOWNERS.

### Observabilidad y Operación
- Tracing OTel con atributos `tenant_id`, `service`, `assembly_id|user_id`.
- Logs JSON estructurados; métricas técnicas y de negocio expuestas en `/metrics`.
- Dashboards y alertas SLO para latencia p95, ratio de éxito login, detección reuse tokens y backlog outbox.

### Versionado y Entregas
- SemVer por servicio; tags y changelogs autogenerados.
- Rama `main` protegida; estrategia `release/*`, `feat/*`, `fix/*`, `chore/*`.
- Workflows: lint → test → build → scan → image → helm-lint → deploy (dev) con promoción manual a stg/prod.

## Servicios Backend y Responsabilidades

### Auth Service (Identidad y Tokens)
- **Responsabilidad:** autenticación, emisión de tokens, flujo de recuperación y métricas de sesión.
- **Estado:**
  - Endpoints activos: `/register`, `/login`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/health`, `/metrics`.
  - Validaciones de entrada con Zod; hashing Argon2id configurable (`AUTH_ARGON2_*`).
  - JWT Access + Refresh con rotación básica y guardia brute force email+IP.
  - Migraciones base para usuarios, roles y auditoría de seguridad; logging JSON y métricas técnicas HTTP.
  - Password reset tokens aislados (Redis en producción, fallback in-memory en tests).
- **Backlog priorizado:**
  - JWKS y rotación de claves asimétricas (RS256/ES256) con endpoints OIDC (`/.well-known/jwks.json`, `/.well-known/openid-configuration`).
  - Integración con gateway para verificación centralizada de JWT y políticas de autorización.
  - Métricas de negocio (`auth_token_revoked_total`, `auth_lockouts_total`, `auth_refresh_reuse_detected_total`, histogramas de rotación).
  - Outbox + eventos (`user.registered`, `password.changed`) y contrato OpenAPI formal consolidado.
  - Tracing OTel por endpoint con atributos `auth.user_id` y `auth.flow`.
  - Política de logout (invalidación de refresh actual + denylist corta de access tokens comprometidos).
  - Roadmap MFA (WebAuthn/TOTP) posterior a JWKS estable.

### User Service (Perfil Global)
- **Responsabilidad:** perfil y atributos personales del usuario; enlace base usuario↔tenant.
- **Estado:** scaffold con CRUD `/users` en memoria y plan para `/profile` y `/preferences`.
- **Backlog priorizado:** migraciones reales, validaciones, eventos `user.created`, métricas de usuarios activos e integración con Tenant Service para enriquecer vistas sin duplicar unidades.

### Tenant Service (Gobernanza y Multitenancy)
- **Responsabilidad:** tenants, unidades, memberships, roles de gobernanza y políticas.
- **Estado:** Fase 0 completa con contrato `tenant.yaml` v0.1, migraciones (`tenants`, `units`, `unit_memberships`, `governance_positions`, `tenant_policies`, `outbox_events`) y métricas (`tenant_created_total`, `unit_created_total`, `membership_active`, `governance_transfer_total`). Endpoints para `transfer-admin` y `tenant-context` activos; gestión outbox/DLQ con métricas y purga.
- **Backlog priorizado:**
  - CRUD de unidades (create + soft deactivate) y alta de memberships con validación de solapamiento (HTTP 409) y eventos `membership.added`.
  - Delegaciones temporales (`/tenants/{id}/governance/delegate`), expiración TTL automática y métrica `governance_delegation_active`.
  - Integración con Auth: incluir `tenant_ctx_version` en refresh y cache L1 con invalidación por evento de contexto.
  - Motor de políticas (`max_delegation_days`, `max_units`) y auditoría extendida con chain hash.

### Assembly Service (Flujos y Actas)
- **Responsabilidad:** cálculos de quórum, derechos de voto y flujos de actas apoyados en contexto Tenant/User.
- **Estado:** dependencias y flujos documentados; implementación pendiente.
- **Backlog priorizado:** definir contratos y PRD detallado, modelar dominio y persistencia, integrar trazabilidad con Tenant Service antes de exponer endpoints.

### Flujo Estándar de Creación de Usuario (Multi-tenant)
1. **Registro / Invitación:** Auth Service recibe email (opcional tenant inicial), crea identidad con Argon2id y emitirá `user.registered` cuando outbox esté disponible.
2. **Persistencia de Perfil:** User Service almacena atributos (nombre, idioma, preferencias) vía evento o invocación directa; no asigna unidades.
3. **Asociación a Tenant:** Tenant Service relaciona usuario↔tenant global.
4. **Asignación de Unidades y Roles:** Tenant Service gestiona memberships de unidades y transferencias/delegaciones (`/tenants/{id}/governance/*`).
5. **Emisión de Tokens con Contexto:** Auth consulta `/tenant-context` para incluir claims ligeros (`t_roles`, `tenant_ctx_version`); refresh posterior actualiza claims cuando la versión cambie.
6. **Consumo en Servicios:** Assembly Service y otros consultan Tenant Service on-demand para cálculos de permisos profundos.

**Principios:** JWT minimalista (solo IDs y roles agregados); versionado de contexto (`tenant_ctx_version`) para invalidación eficiente; dominios segregados para desacoplar gobernanza de autenticación.

## Arquitectura de Testing — Auth Service

### Estructura Jest
Tres proyectos en `jest.config.js`:
1. **security:** generación/validación de tokens y rotación (DB y Redis mock controlados).
2. **unit:** lógica pura sin efectos secundarios (en expansión tras refactor `internal/app`).
3. **integration:** pruebas contra Postgres real (migraciones aplicadas en setup) y Redis simulado en memoria.

### Política de Mocks
- `pg` nunca se mockea en `integration`; se validan SQL y transacciones reales.
- `ioredis` se redirige vía `moduleNameMapper` a mock único extendido (`set/get/del/incr/expire/ttl`).
- Evitar mocks globales implícitos; cualquier nuevo mock debe documentarse en README antes de introducirse.

### Datos y Aislamiento
- Emails con sufijo aleatorio para evitar colisiones únicas.
- Coste Argon2id reducido en test (`t=2, m=4096, p=1`).
- Limpieza y cierre de recursos en `afterAll` (Pool Postgres, Redis mock, registros OTel/Prom).

### Objetivos de Cobertura y Calidad
- Corto plazo: ≥60% en `internal/app` y adaptadores críticos; mediano plazo: ≥80% incluyendo dominio.
- Métrica adicional planificada: cobertura de rutas HTTP críticas (login, refresh, reset).

### Contratos, Snapshots y Migraciones
- Pruebas de contrato HTTP generadas desde OpenAPI + validación con Spectral antes de merge.
- Snapshots sanitizados (reemplazo `<JWT>` / `<REFRESH>`).
- Pruebas de migraciones en CI para garantizar compatibilidad forward-only.

### Métricas y Seguridad Relacionada con Testing
- Contadores `test_flaky_detected_total` y `test_duration_seconds{project}` para detectar flakiness y regresiones de performance.
- Dependencias de seguridad antes de ampliar a WebAuthn/TOTP: JWKS rotación validada, detección reuse refresh tokens instrumentada y contrato OpenAPI estabilizado.

## Roadmap de Observabilidad

1. **Fase actual:** métricas técnicas y logs estructurados (auth-service completo; tenant-service parcial).
2. **Próximo paso:** tracing OTel mínimo con propagación `x-request-id` → `trace_id`.
3. **Fase de expansión:** métricas de negocio Auth (login_success, login_fail, refresh_reuse, password_reset) y dashboards.
4. **Operación avanzada:** alertas SLO (p99 login, tasa fallos refresh, spikes reuse) y playbooks.
5. **Correlación multi-servicio:** atributos consistentes (`tenant_id`, `user_id`) para Assembly/Tenant/Auth.

Indicadores clave planeados: `auth_login_success_total`, `auth_login_fail_total`, `auth_refresh_reuse_detected_total`, `tenant_context_fetch_duration_seconds` (p95 <120ms), `outbox_pending` vs `outbox_event_age_seconds`.

## Decisiones Técnicas Recientes

| Fecha | Decisión | Impacto |
|-------|----------|---------|
| 2025-09-14 | Unificar mock Redis vía mapper | Eliminación de flakiness en integración |
| 2025-09-14 | Eliminar mock `pg` en security/integration | Base de datos real en flujos críticos |
| 2025-09-15 | Priorizar JWKS sobre WebAuthn | Reduce riesgo de claves simétricas y rotación manual |
| 2025-09-15 | Añadir teardown explícito Pool/Redis | Previene fugas de handles en Jest |
| 2025-09-15 | Introducir roadmap de métricas de negocio | Base para alertas tempranas de abuso |
