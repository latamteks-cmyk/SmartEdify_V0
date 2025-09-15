

# Especificaciones Técnicas Consolidadas de SmartEdify (Backend)

## 1. Estructura Monorepo y Arquitectura

- Apps ejecutables en `apps/` (web, móvil, servicios).
- Microservicios en `apps/services/` (assembly, auth, user, etc.), cada uno con estructura:
	- `cmd/server/main.*` como entrypoint único.
	- `internal/app` (commands, queries, sagas), `internal/domain` (aggregates, events, policies), `internal/adapters/http|repo|bus|ext`, `internal/config`.
	- `api/openapi.yaml` y `api/proto/` para contratos.
	- `migrations/` para scripts SQL y versionado.
	- `tests/unit|integration/` para pruebas.
	- `helm/`, `k8s/` para despliegue.
- Librerías compartidas en `packages/` (core-domain, security, http-kit, event-bus, persistence, validation, i18n, ui-kit).
- Contratos externos en `api/` (OpenAPI, proto).
- Migraciones y seeds en `db/`.
- Infraestructura declarativa en `infra/` (terraform, k8s, docker, gateway).
- Operaciones y runbooks en `ops/`.
- Documentación viva en `docs/` (prd, design, api, legal).
- Herramientas internas en `tools/`.
- CI/CD y control de calidad en `.github/`, `Makefile`, `CODEOWNERS`.

## 2. Premisas y Patrones Técnicos

- Contratos primero: cambios en API requieren actualización de OpenAPI/proto y ejemplos, generación de SDKs cliente.
- Configuración por variables de entorno con prefijo por servicio (`AUTH_`, `USER_`, `ASM_`).
- Seguridad: sin secretos en repo, TLS obligatorio, JWT verificado en gateway y servicio, logs sin PII, tokens redactados.
- Persistencia: migraciones versionadas, una transacción por caso de uso, patrón outbox para eventos externos, índices declarados.
- Testing: cobertura mínima 80% en `internal/app` y `domain`, tests de contrato para HTTP/gRPC con snapshots, pruebas de migraciones en CI.
- Observabilidad: tracing OTel con `tenant_id`, `service`, `assembly_id|user_id`, logs JSON, métricas de negocio.
- Documentación: README por servicio, ADR en `docs/design/adr/`, diagramas Mermaid en `docs/design/diagrams/`.
- Calidad: lint y format en pre-commit, convenciones de commit, revisiones obligatorias por CODEOWNERS.
- Versionado: SemVer por servicio, tags y changelogs autogenerados.
- Branching: main protegida, release/*, feat/*, fix/*, chore/*.
- CI/CD: workflows por servicio, jobs: lint → test → build → scan → image → helm-lint → deploy(dev), promoción manual a stg/prod, SBOM + SCA (Trivy/Grype).
- Seguridad supply-chain: imágenes firmadas (cosign), policy admission (Kyverno), escaneo semanal de dependencias.
- Integración: comunicación sincrónica vía HTTP/gRPC solo en lectura/validaciones rápidas, escritura y orquestación por eventos (Kafka/NATS) con outbox, idempotencia por `x-request-id` y `event-id`, retries exponenciales y DLQ.

## 3. Microservicios (Backend)

### Auth Service (Identidad y Tokens)
Estado implementado (MVP reforzado):
* Endpoints activos: `/register`, `/login`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/health`, `/metrics`.
* (Se removieron de su alcance conceptual los endpoints de gobierno `/roles`, `/permissions` y cualquier transferencia de admin: ahora responsabilidad futura de Tenant Service.)
* Validaciones de entrada con Zod (DTOs en `adapters/http`).
* Hashing Argon2id configurable (`AUTH_ARGON2_*`).
* Emisión de JWT Access + Refresh (rotación básica + detección reuse inicial por Redis planificada).
* Rate limiting de /login + guardia brute force email+IP.
* Migraciones base (users, user_roles, audit_security) en carpeta limpia.
* Logging JSON estructurado + métricas técnicas HTTP + primeras métricas de negocio (login / reset / refresh rotation).
* Password reset tokens aislados (Redis en prod, in-memory fallback en test).

* Backlog próximo (priorizado actualizado):
* (P1) JWKS + rotación de claves asimétricas (RS256/ES256) y endpoints OIDC (`/.well-known/jwks.json`, `/.well-known/openid-configuration`).
* (P1) Integración gateway: verificación centralizada JWT (desacoplar verificación directa en servicio).
* (P1) Métricas adicionales: `auth_token_revoked_total`, `auth_lockouts_total`, `auth_refresh_reuse_detected_total`, histogram de latencia rotación.
* (P2) Outbox + eventos (`user.registered`, `password.changed`).
* (P2) Tracing OTel y spans por endpoint (incluir atributos: `auth.user_id`, `auth.flow`).
* (P3) Política de logout (invalidación refresh actual + short denylist access tokens comprometidos).
* (P3) WebAuthn/TOTP (post JWKS estable y gateway). 
* (P3) OpenAPI formal consolidado + ejemplos versionados.

### User Service (Perfil Global)
Responsabilidad: Datos de perfil y atributos personales + enlace base usuario↔tenant (no unidades ni gobernanza). 
Estado (scaffold): CRUD `/users` (en memoria), plan para `/profile` y `/preferences`.
Backlog: migraciones, validaciones, eventos `user.created`, métricas (usuarios activos), integración contextual con Tenant Service (para enriquecer vistas pero sin duplicar estructuras de unidades).

Exclusiones claras: No gestiona unidades físicas, delegaciones de junta, ni transferencias de gobernanza (Tenant Service).

### Assembly Service
Consumidor de contexto (usuarios, tenants, roles de gobernanza) para computar quórum, derechos de voto y flujos de actas.
Dependerá de Tenant Service para validar roles de junta (presidente, vicepresidente, etc.) y membresías de unidades cuando impacten en votos ponderados.
### Tenant Service (Nuevo — Gobierno y Estructura Organizativa)
Responsabilidad: Tenants (condominios), unidades, memberships (owner/renter/family), posiciones de gobernanza (admin/presidente/vicepresidente/tesorero) y políticas (unicidad admin, límites de delegaciones).
Estado: Fase 0 en progreso (contrato y migración inicial creados; ver `apps/services/tenant-service/api/openapi/tenant.yaml`).
Alcance actual Fase 0: `tenant.yaml` v0.1 + migraciones (tenants, units, unit_memberships, governance_positions, tenant_policies, outbox_events) ya aplicadas en repo.
Eventos previstos: `tenant.created`, `unit.created`, `membership.added|revoked|expired`, `governance.changed`.
Métricas iniciales: `tenant_created_total`, `unit_created_total`, `membership_active`, `governance_transfer_total`, `membership_overlap_conflict_total`.

Exclusiones: Autenticación de credenciales, hashing, emisión de tokens (Auth Service) y datos personales ampliados (User Service).

### Flujo Estándar de Creación de Usuario (Multi‑Tenant)
1. Registro / Invitación: Auth Service recibe email (+ opcional tenant inicial). Crea identidad (usuario base) con hash Argon2id. Emite evento `user.registered` (cuando outbox esté disponible).
2. Persistencia de Perfil: User Service escucha (o es invocado) para almacenar atributos de perfil (nombre, idioma, preferencias). No asigna unidades.
3. Asociación a Tenant: Tenant Service crea la relación básica usuario↔tenant (membership global) si aplica, sin todavía asociar unidades específicas.
4. Asignación de Unidades y Roles de Gobernanza: A través de endpoints de Tenant Service se añaden memberships de unidad y se gestionan transferencias/delegaciones (`/tenants/{id}/governance/transfer-admin`, `/tenants/{id}/governance/delegate`).
5. Emisión de Tokens con Contexto: Auth Service, en login o refresh, puede consultar (o cachear breve) `/tenant-context` para incluir claims ligeros (`t_roles`, `tenant_ctx_version`). Si la versión cambia, el siguiente refresh actualiza claims.
6. Uso en Servicios Consumidores: Assembly Service y otros consultan Tenant Service para cálculos de quórum o permisos contextuales profundos en lugar de inflar el JWT con todas las unidades.

Principios:
* JWT minimalista: sólo IDs y roles agregados; detalles se resuelven on-demand.
* Versionado de contexto: `tenant_ctx_version` evita re-fetch constante.
* Segregación de dominios: cambios en reglas de gobernanza no fuerzan despliegue de Auth/User.

## 8. Arquitectura de Testing Multi-Proyecto (Auth Service)

Estrategia adoptada para garantizar aislamiento y reproducibilidad:

### 8.1 Estructura Jest
Tres proyectos declarados en `jest.config.js`:
1. `security`: pruebas focalizadas en generación/validación de tokens y rotación (mock de DB y Redis controlado).
2. `unit`: reservado para lógica pura (sin side effects); actualmente se añadirá al refactor de `internal/app`.
3. `integration`: ejecuta contra Postgres real (migraciones aplicadas en setup global) y Redis simulado en memoria.

### 8.2 Política de Mocks
- `pg` nunca se mockea en `integration` para validar SQL real y transacciones.
- `ioredis` se redirige vía `moduleNameMapper` a un mock único extendido (`set/get/del/incr/expire/ttl`).
- Se eliminó duplicidad de mocks (`__mocks__/ioredis.ts` vs `tests/__mocks__/ioredis.ts`) usando `modulePathIgnorePatterns` y neutralización del archivo sobrante.
*- Evitar mocks implícitos globales:* cualquier mock nuevo debe documentarse en README antes de introducirse.

### 8.3 Datos y Aislamiento
- Correos electrónicos generados con sufijo aleatorio para evitar colisiones únicas en DB.
- Coste Argon2id reducido en entorno test (`t=2, m=4096, p=1`) para acelerar.
- Limpieza y cierre de recursos en `afterAll` (Pool Postgres, Redis mock, register métricas OTel/Prom).

### 8.4 Objetivos de Cobertura
- Corto plazo: >=60% en `internal/app` y adaptadores críticos.
- Mediano plazo: >=80% incluyendo dominio tras refactor.
- Métrica adicional planificada: cobertura de rutas HTTP críticas (login, refresh, reset).

### 8.5 Contratos y Snapshots
- Próximo hito: pruebas de contrato HTTP generadas desde OpenAPI + validación con Spectral antes de merge.
- Snapshots: se almacenarán respuestas sanitizadas (sin tokens reales, reemplazo `<JWT>` / `<REFRESH>`).

### 8.6 Métricas de Calidad de Tests
Se instrumentarán (internamente o en CI) contadores:
- `test_flaky_detected_total` (marcado cuando una re-ejecución pasa tras un fallo intermitente).
- `test_duration_seconds{project}` histogram para detectar regresiones de performance.

### 8.7 Roadmap Seguridad Relacionado con Testing
Dependencias antes de ampliar a WebAuthn/TOTP:
1. JWKS rotación implementada y validada (pruebas integration + security).
2. Detección reuse refresh tokens metricada y alerta (umbral configurable).
3. Contrato OpenAPI Auth estabilizado (lint + ejemplos) para enable contract tests.

## 9. Roadmap Observabilidad (Resumen Expandido)
Fases:
1. (Actual) Métricas técnicas + logs estructurados (completo en auth-service, parcial tenant-service).
2. Tracing OTel mínimo: spans por endpoint + propagación `x-request-id` → `trace_id`.
3. Métricas de negocio Auth (login_success, login_fail, refresh_reuse, password_reset) + dashboards.
4. Alertas SLO (p99 latency login, tasa fallos refresh, reuse detection spike) y playbooks.
5. Correlación cross-service (Assembly/Tenant/Auth) con atributos consistentes (`tenant_id`, `user_id`).

Indicadores clave planeados:
- `auth_login_success_total`, `auth_login_fail_total` (ratio conversión login = success/(success+fail)).
- `auth_refresh_reuse_detected_total` (alerta si >0 en ventana corta).
- `tenant_context_fetch_duration_seconds` (p95 < 120ms objetivo inicial).
- `outbox_pending` vs `outbox_event_age_seconds` (alerta si age p95 > 5m).

## 10. Decisiones Técnicas Recientes (Resumen Incremental)
| Fecha | Decisión | Impacto |
|-------|----------|---------|
| 2025-09-14 | Unificar mock Redis vía mapper | Eliminación de flakiness integración |
| 2025-09-14 | Eliminar mock `pg` en security/integration | DB real en flujos críticos |
| 2025-09-15 | Priorizar JWKS sobre WebAuthn | Reduce riesgo claves simétricas rotación manual |
| 2025-09-15 | Añadir teardown explícito Pool/Redis | Previene fugas de handles Jest |
| 2025-09-15 | Introducir roadmap métricas negocio | Base para alertas tempranas abuso |



## 4. Integración y Dependencias

- Comunicación entre servicios por HTTP/gRPC solo para lectura/validación rápida.
- Escritura y orquestación por eventos (Kafka/NATS) con outbox.
- Idempotencia por `x-request-id` y `event-id`.
- Retries exponenciales y DLQ por servicio.
- SDKs generados desde OpenAPI/proto y publicados en `packages/*-sdk`.

## 5. Seguridad y Auditoría

- TLS obligatorio en todos los servicios y gateway.
- JWT verificado en gateway y servicios.
- Logs sin PII, tokens redactados.
- Policy admission (Kyverno): no-run-as-root, readOnlyRootFs.
- Firmar imágenes con cosign.
- Escaneo semanal de dependencias y SBOM.

## 6. Observabilidad y Calidad

- Logs JSON estructurados listos (auth-service y tenant-service).
- Métricas:
	- Outbox & Broker: latencia publicación, retries, DLQ, payload bytes.
	- Consumer: lag, throughput, latencia handlers, retries, inflight, handler not found.
	- Negocio inicial: tenants/unidades, governance transfers, auth logins (parcial), memberships (gauge planificado).
- Tracing OTel pendiente (backlog) y alertas SRE por definir.
- Lint y format en pre-commit, convenciones de commit, revisiones por CODEOWNERS.

## 7. Documentación y Entregables

- README por servicio con run local, variables, endpoints, decisiones, SLO, contacto equipo.
- ADR en `docs/design/adr/` (incluye 0004 Publisher & Envelope, 0005 Consumer Processing), diagramas Mermaid pendientes.
- Documentación OpenAPI/proto y ejemplos actualizados en cada cambio de API (en progreso; faltan ejemplos formales y lint automático).
 
### 7.2 Pipeline de Eventos (Resumen Técnico)
1. Persistencia Outbox (PostgreSQL) con retries y DLQ (tabla `outbox_events_dlq`).
2. Poller valida envelope (schema + tamaño) y publica vía Publisher abstraction (`LoggingPublisher` / `KafkaPublisher`).
3. Métricas de publicación: intentos, éxitos, fallos, latencia, payload bytes.
4. Consumer monitoring (lag) separado de processing para despliegue progresivo.
5. Processing consumer con retry heurístico y métricas de rendimiento.
6. Hook futuro: schema registry + firma de eventos.
 
Diagrama: `docs/design/diagrams/event-pipeline.mmd` (Mermaid) ilustra flujo y puntos de observabilidad.

### 7.1 Ubicación de Contratos OpenAPI (Separados)

Los contratos fueron extraídos de documentos narrativos y ahora residen en:

- `api/openapi/auth.yaml` (MVP Auth: register, login, refresh-token, forgot/reset, health, metrics)
- `api/openapi/user.yaml` (MVP User: CRUD básico /users — en memoria inicialmente)
- `api/openapi/assembly.yaml` (Assembly: subconjunto inicial del flujo completo: create, list, get, validate agenda, publish call, check-in, voting, draft minutes)
- `api/openapi/tenant.yaml` (Existe: tenants, units, memberships, governance transfer/delegate — v0.1 Fase 0)

Reglas:
1. Cualquier cambio de endpoint debe actualizar el archivo YAML correspondiente en la misma PR.
2. Ejecutar lint (pendiente script `spectral lint`) antes de merge.
3. Añadir ejemplos de request/response representativos en siguiente iteración (`/api/examples/` futura carpeta).
4. Generar SDKs cliente (pipeline pendiente) a partir de estos contratos.

---

# Referencias
* docs/Auth Service/Diseño y Arquitectura.md
* docs/Auth Service/legal y marketing.md
* docs/Auth Service/PDR_AUTH.md
* docs/Auth Service/PDR_USER.md
* docs/Auth Service/Pruebas y Garantía de Calidad.md
* docs/Assembly/Flujos.md
* docs/Assembly/PRD.md
* analisis.md (justificación Tenant Service y plan de fases)
* incorporacion.md (adaptar: separar gobernanza hacia Tenant Service)
* README.md (estructura y premisas actualizada con estado de observabilidad y seguridad)
