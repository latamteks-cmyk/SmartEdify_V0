# Arquitectura Backend SmartEdify — Overview

> Última actualización: 2025-09-17. Sustituye al antiguo `docs/spec.md` como fuente única de verdad del backend.

## Monorepo y Capas Principales

- **Aplicaciones (`apps/`)**: alberga los ejecutables backend. Hoy contiene `auth-service` y `tenant-service` operativos, `user-service` con CRUD en memoria y `assembly-service` aún documental.
- **Microservicios (`apps/services/<service>`):** convención Node.js por servicio con `cmd/server/main.ts` (entrypoint), `internal/` para app/domain/adapters, carpetas de `migrations/`, `tests/` y manifiestos (`helm/`, `k8s/`) a crear cuando corresponda. Contratos viven en `api/openapi/`.
- **Librerías compartidas (`packages/`)** *(Roadmap)*: carpeta aún no creada; hasta entonces los servicios mantienen adaptadores internos duplicados.
- **Contratos externos (`api/`)**: OpenAPI y proto compartidos. Auth expone `api/openapi/auth.yaml`; Tenant cuenta con `api/openapi/tenant.yaml` v0.1; User/Assembly siguen pendientes.
- **Migraciones y seeds (`db/`)** *(Roadmap)*: cada servicio mantiene sus migraciones en origen. Se unificará cuando exista plataforma de datos compartida.
- **Infraestructura declarativa (`infra/`)** *(Roadmap)*: pendiente de incorporar Terraform/K8s. Hoy sólo `docker-compose.yml` para Postgres/Redis locales.
- **Operaciones y runbooks (`ops/`)** *(Roadmap)*: migrar runbooks desde README a carpeta dedicada cuando crezca el catálogo.
- **Documentación (`docs/`)**: PRD, ADRs, arquitectura, auditorías y snapshots ejecutivos.
- **Herramientas internas (`scripts/`, `plans/`)**: scripts puntuales (`scripts/dev-up.ps1`) y planes/diagrams en `plans/` y `docs/design`.
- **Calidad y CI/CD (`.github/`, `Makefile`)**: workflows por servicio (Auth con Jest + build + scan, Tenant en proceso), configuración de dependabot y convenciones de commits.

## Principios Técnicos

### Contratos y Configuración
- Contratos primero: cada cambio público debe actualizar OpenAPI, ejemplos y tests de contrato (Spectral + snapshots, pendiente de automatizar).
- Variables de entorno con prefijo por servicio (`AUTH_`, `TENANT_`, etc.) y plantillas `.env.example` versionadas.
- Configuración sensible fuera del repositorio; usar GitHub Secrets / AWS Secrets Manager para despliegues.

### Seguridad y Cumplimiento
- TLS extremo a extremo a través del gateway (pendiente de implementación); servicios internos sólo escuchan en `0.0.0.0` en dev.
- JWT con `aud`, `iss`, `sub`, `tenant_id`, `roles`, `jti` y `type`; rotación automática basada en JWKS en Auth.
- Logs JSON con anonimización: tokens accesos redactados (próximo hito) y sin PII cruda.
- Imágenes firmadas (cosign) + políticas Kyverno (`runAsNonRoot`, `readOnlyRootFilesystem`) en roadmap.

### Persistencia y Datos
- Migraciones forward-only por servicio. Auth ya incluye `users`, `user_roles`, `auth_signing_keys`, auditoría y seeds básicos; Tenant cubre tenencias, unidades, memberships, gobernanza y outbox/DLQ.
- Outbox pattern obligatorio para integraciones externas; Tenant ya lo ejecuta con DLQ y publisher/consumer.
- Idempotencia por `x-request-id`/`event-id` y manejo de `retry_count` en outbox.

### Testing y Calidad
- Lint + format en pre-commit (pendiente de reforzar en todos los servicios).
- Objetivo de cobertura ≥80 % en `internal/app` y dominio una vez estabilizada la refactorización.
- Pruebas de contrato HTTP (Spectral + Jest snapshots) pendientes de automatizar en CI.

### Observabilidad y Operación
- Tracing OpenTelemetry habilitado en Auth y Tenant (OTLP exporter configurable) con atributos `tenant_id`, `service`, `user_id` cuando aplica.
- Logs JSON estructurados vía Pino/Pino-http con correlación `x-request-id` y `trace_id` cuando hay span activo.
- Métricas Prometheus por servicio: Auth emite HTTP + negocio (`auth_login_success_total`, `auth_refresh_reuse_blocked_total`, etc.), Tenant cubre outbox, DLQ, broker y negocios (`tenant_created_total`, `membership_active`).
- Dashboards y alertas SLO por definir (ver roadmap de observabilidad).

### Versionado y Entregas
- SemVer por servicio, tags a definir al momento del primer release público.
- Ramas `main` protegidas; ramas de trabajo `feat/*`, `fix/*`, `chore/*`.
- Pipelines objetivo: lint → test → build → scan → image → helm lint → deploy dev → promoción manual a stg/prod.

## Servicios Backend y Responsabilidades

### Auth Service (Identidad y Tokens)
- **Responsabilidad:** autenticación, emisión/rotación de tokens, recuperación de credenciales y métricas de sesión.
- **Estado:**
  - Endpoints activos: `/register`, `/login`, `/logout`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/roles`, `/permissions`, `/health`, `/metrics`, `/.well-known/jwks.json`, `/admin/rotate-keys` (MVP), `/debug/current-kid` (solo dev/test).
  - Validaciones Zod, hashing Argon2id parametrizable y rate limiting + brute-force guard Redis (`bf:<email>:<ip>`).
  - JWT firmados con clave asimétrica (`auth_signing_keys` en Postgres), cache in-memory, JWKS público y rotación manual promoviendo `current→retiring→expired`.
  - Persistencia: Postgres (`users`, `user_roles`, `audit_security`) y Redis para sesiones, refresh y reset tokens (fallback in-memory en tests).
  - Observabilidad: logging JSON (Pino), tracing OTel (auto-instrumentaciones HTTP/Express/PG) y métricas `auth_http_requests_total`, `auth_http_request_duration_seconds`, `auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_requested_total`, `auth_password_reset_completed_total`, `auth_refresh_rotated_total`, `auth_refresh_reuse_blocked_total`, `auth_jwks_keys_total{status}`, `auth_jwks_rotation_total`.
  - Testing: Jest multiproyecto (`security`, `unit`, `integration`) con migraciones aplicadas en `global-setup` y Redis mock consistente.
- **Backlog priorizado:**
  - Proteger `/admin/rotate-keys` con autenticación/roles y automatizar rotación (cron + expiración `retiring→expired`).
  - Emitir eventos (`user.registered`, `password.changed`) vía outbox + publisher y propagar a User/Tenant.
  - Completar contrato OpenAPI + pruebas de contrato Spectral/Jest y publicar SDK.
  - Redactar tokens/PII en logs, exponer métricas de saturación (pool PG, Redis) y definir alertas SLO.
  - Integración con gateway: validación centralizada de JWT, cache JWKS y claims `tenant_ctx_version` provenientes de Tenant.
  - Roadmap MFA (WebAuthn/TOTP) tras cerrar rotación automatizada y outbox.

### User Service (Perfil Global)
- **Responsabilidad:** perfil y atributos del usuario; enrutamiento base usuario↔tenant.
- **Estado:** API Express con CRUD `/users` en memoria (persistencia y contratos por definir); pruebas unitarias básicas.
- **Backlog priorizado:**
  - Migrar a Postgres con migraciones (`users`, `profiles`, `preferences`) e índices.
  - Definir OpenAPI + examples, DTOs Zod y validaciones.
  - Integrar eventos (`user.created`, `user.updated`) y métricas de usuarios activos.
  - Sincronización con Tenant Service para enriquecer vistas sin duplicar gobernanza.

### Tenant Service (Gobernanza y Multitenancy)
- **Responsabilidad:** tenants, unidades, memberships, roles de gobernanza, políticas y distribución de contexto multi-tenant.
- **Estado:**
  - Endpoints productivos: `/tenants` (create/get), `/tenants/{id}/units` (create/list), `/units/{id}/memberships` (alta), `/tenants/{id}/governance/transfer-admin`, `/tenant-context`, `/outbox/dlq` (list/reprocess/purge), `/metrics`, `/health`.
  - Persistencia Postgres con migraciones (`tenants`, `units`, `unit_memberships`, `governance_positions`, `role_definitions`, `role_assignments`, `outbox_events`, `outbox_events_dlq`) y constraints (unicidad admin, exclusión renter/owner, active flag).
  - Outbox + DLQ operativos con poller, métricas de latencia/retries, publisher Logging/Kafka (configurable) y consumer de lag con OTel spans (`kafka.publish`).
  - Roles dinámicos vía `rolesRepo` y cálculo `tenant-context` con versión hash (`version`) y roles combinados (governanza + asignaciones).
  - Observabilidad: métricas negocio (`tenant_created_total`, `unit_created_total`, `membership_active`, `governance_transfer_total{result}`) y operativas (`outbox_*`, `broker_*`, `consumer_*`, `tenant_context_latency` en roadmap) más tracing OTel (Fastify + KafkaJS).
  - Seguridad: plugin JWT opcional (`authJwtPlugin`) con soporte JWKS (`TENANT_JWKS_URL`) o clave pública PEM (`TENANT_JWT_PUBLIC_KEY`).
- **Backlog priorizado:**
  - Implementar delegaciones temporales (`/tenants/{id}/governance/delegate`) con expiración automática y métricas `governance_delegation_active`.
  - Completar validación de solapamiento memberships (HTTP 409 con detalles) y versión 2 del evento `membership.added` registrada en `event-schemas`.
  - Cache L1/L2 de `tenant-context` (TTL + invalidación por evento) e integración con Auth para `tenant_ctx_version`.
  - Consolidar publisher Kafka (gestión de topics, retries externos) y consumidor real con handler registry + DLQ específica.
  - Automatizar pruebas (Vitest) en CI/CD, coverage de repositorios y contract tests OpenAPI.
  - Motor de políticas (`max_delegation_days`, `max_units`) y auditoría chain-hash extendida.

### Assembly Service (Flujos y Actas)
- **Responsabilidad:** flujos de asambleas, quórum y trazabilidad apoyada en Auth/Tenant.
- **Estado:** únicamente documentación inicial en `api/` y README. Código pendiente.
- **Backlog priorizado:**
  - Modelado de dominio y PRD/ADR antes de escribir código.
  - Definir persistencia, outbox e integración con eventos Tenant/Auth.
  - Establecer KPIs (participación, cumplimiento quorum) y pruebas de contrato.

### Flujo estándar de creación y habilitación de usuario (multi-tenant)
1. **Registro / Invitación:** Auth recibe email y tenant opcional → crea identidad, genera métricas (`auth_login_*` cuando aplique) y, una vez habilitado el outbox, emitirá `user.registered`.
2. **Persistencia de perfil:** User Service almacenará atributos (nombre, idioma, preferencias) a partir de evento o invocación directa.
3. **Asociación a tenant:** Tenant Service relaciona usuario↔tenant y registra memberships iniciales.
4. **Asignación de roles y unidades:** Tenant gestiona memberships, roles dinámicos y transferencias/delegaciones (`transfer-admin` hoy, `delegate` en roadmap).
5. **Emisión de tokens con contexto:** Auth consulta `/tenant-context` para calcular claims (`roles`, `tenant_ctx_version`); refresh detecta invalidaciones via versión.
6. **Consumo downstream:** Assembly y demás servicios consultan Tenant bajo demanda para cálculos profundos.

**Principios:** JWT livianos (IDs + roles agregados), versión de contexto para invalidaciones eficientes y dominios separados (identidad vs gobernanza).

## Arquitectura de Testing — Auth Service

### Configuración Jest multiproyecto
Tres proyectos en `jest.config.js`:
1. **security:** rotación de claves, JWKS y reutilización de refresh tokens (mocks de PG/Redis controlados).
2. **unit:** lógica pura (`internal/app` y helpers) sin efectos externos.
3. **integration:** flujos contra Postgres real (migraciones `migrations_clean/`) y Redis simulado in-memory.

### Política de Mocks
- `pg` no se mockea en `integration`; se validan SQL reales.
- `ioredis` se redirige vía `__mocks__/ioredis.ts` compartido para mantener estado consistente.
- Nuevos mocks requieren documentación previa en README para evitar deuda oculta.

### Datos y Aislamiento
- Emails con sufijo aleatorio para evitar colisiones únicas.
- Coste Argon2 reducido en test (`t=2, m=4096, p=1`).
- Limpieza y cierre de recursos en `global-teardown` (Pool Postgres, Redis mock, métricas registradas).

### Cobertura y Calidad
- Objetivo corto plazo: ≥60 % en `internal/app` y adaptadores críticos; mediano plazo ≥80 % incluyendo dominio.
- Métrica adicional planificada: cobertura de rutas HTTP críticas (login, refresh, reset) publicada en pipeline.

### Contratos, Snapshots y Migraciones
- OpenAPI Auth pendiente de actualización. Roadmap: generar tests de contrato desde especificación y validar con Spectral antes de merge.
- Snapshots sanitizados (reemplazo `<JWT>`, `<REFRESH>`). Tests de migraciones ejecutados en `global-setup`.

### Métricas y Seguridad en Testing
- Contadores `test_flaky_detected_total` y `test_duration_seconds{project}` planificados para pipeline Jenkins/GitHub Actions.
- Validar detección de reuse refresh tokens e invalidación de sesiones durante pruebas de seguridad.

## Roadmap de Observabilidad

1. **Fase actual:** métricas técnicas + negocio Auth/Tenant y tracing OTel básico (HTTP/PG/Kafka) sin dashboards.
2. **Próximo paso:** dashboards Prometheus/Grafana para login, refresh, outbox y consumer lag; alertas iniciales (p95 login >250 ms, outbox_pending>100, DLQ growth).
3. **Fase de expansión:** métricas de negocio adicionales (lockouts, delegations activas), tracing cross-service con propagación `x-request-id` → `trace_id` y muestreo adaptativo.
4. **Operación avanzada:** playbooks SRE en `ops/`, alertas SLO y reporte semanal de tendencias.
5. **Correlación multi-servicio:** atributos consistentes (`tenant_id`, `user_id`, `roles`) compartidos entre Auth, Tenant y futuros servicios (Assembly) con dashboards compartidos.

Indicadores clave actuales: `auth_login_success_total`, `auth_login_fail_total`, `auth_refresh_reuse_blocked_total`, `tenant_created_total`, `membership_active`, `outbox_pending`, `outbox_event_age_seconds`, `broker_consumer_lag_max`.

## Decisiones Técnicas Recientes

| Fecha | Decisión | Impacto |
|-------|----------|---------|
| 2025-09-16 | Implementar almacén JWKS con rotación `current/next/retiring` | Habilita claves asimétricas y métricas `auth_jwks_*` |
| 2025-09-16 | Activar métricas de negocio Auth (login/reset/refresh) | Base para alertas de abuso y seguimiento de funnels |
| 2025-09-16 | Publicar `/tenant-context` con roles combinados + versión hash | Permite invalidar claims y enriquecer tokens Auth |
| 2025-09-16 | Añadir outbox DLQ + endpoints reprocess/purge en Tenant | Reduce riesgo de pérdida de eventos y facilita operación |
| 2025-09-15 | Unificar mock Redis y teardown Jest | Estabiliza suite de integración Auth |
| 2025-09-14 | Priorizar roadmap observabilidad (metrics + tracing) | Define secuencia de adopción y alertas SLO |
