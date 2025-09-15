Estructura monorepo y premisas. Objetivo: entrega rápida, calidad constante, auditoría simple.

> Snapshot estratégico actualizado: ver `docs/status.md` (2025-09-15). Especificación técnica consolidada en `docs/spec.md`. Backlog granular en `docs/tareas.md`.

# 1) Estructura de carpetas (top-level)

```
smartedify/
├─ apps/                     # Ejecutables (front y servicios)
│  ├─ web-app/               # Web App (RBAC único)
│  ├─ web-soporte/           # NOC/Helpdesk
│  ├─ mobile-app/            # iOS/Android (owner-only)
│  └─ services/              # Microservicios
│     ├─ assembly-service/
│     ├─ auth-service/
│     ├─ user-service/
│     ├─ tenant-service/            # Nuevo (gobernanza, unidades, memberships)
│     ├─ finance-service/
│     ├─ document-service/
│     ├─ communication-service/
│     ├─ payments-service/
│     ├─ compliance-service/
│     ├─ reservation-service/
│     ├─ maintenance-service/
│     ├─ payroll-service/
│     ├─ certification-service/
│     └─ facilitysecurity-service/
├─ packages/                 # Librerías compartidas (no ejecutables)
│  ├─ core-domain/           # DDD, tipos, errores comunes
│  ├─ security/              # JWT, JWKS, WebAuthn, TOTP helpers
│  ├─ http-kit/              # Middlewares, client, retry, tracing
│  ├─ event-bus/             # Kafka/NATS SDK + outbox/inbox
│  ├─ persistence/           # Repos genéricos, migraciones helpers
│  ├─ validation/            # Esquemas Zod/JSON-Schema
│  ├─ i18n/                  # Mensajes y plantillas
│  └─ ui-kit/                # Componentes UI compartidos (web)
├─ api/                      # Contratos externos
│  ├─ openapi/               # *.yaml por servicio
│  └─ proto/                 # *.proto para gRPC internos
├─ db/                       # Migraciones y seeds
│  ├─ assembly/
│  ├─ auth/
│  └─ ...
├─ infra/                    # Infraestructura declarativa
│  ├─ terraform/             # VPC, KMS, RDS, S3/WORM, CDN
│  ├─ k8s/                   # Helm charts/overlays (dev,stg,prod)
│  ├─ docker/                # Dockerfiles base + compose local
│  └─ gateway/               # Reglas API Gateway/WAF, OIDC
├─ ops/                      # Operaciones y runbooks
│  ├─ runbooks/
│  ├─ sre/                   # Alertas, SLO, dashboards
│  └─ playbooks/             # Respuesta a incidentes
├─ docs/                     # Documentación viva
│  ├─ prd/                   # PRD por servicio
│  ├─ design/                # ADR, diagramas C4/BPMN/Mermaid
│  ├─ api/                   # Docs HTML generadas de OpenAPI
│  └─ legal/                 # Plantillas actas, checklist legal
├─ tools/                    # CLI internas, generadores, linters
├─ .github/                  # CI/CD (Actions), CODEOWNERS, templates
├─ scripts/                  # make, task runners, dev tooling
├─ Makefile                  # or Taskfile.yml
├─ CODEOWNERS
├─ LICENSE
└─ README.md
```

# 2) Plantilla de servicio (apps/services/\*-service)

```
*-service/
├─ cmd/
│  └─ server/                # main.go / main.kt
├─ internal/
│  ├─ app/                   # commands, queries, sagas
│  ├─ domain/                # aggregates, events, policies
│  ├─ adapters/
│  │  ├─ http/               # handlers, routers, dto
│  │  ├─ grpc/               # opcional
│  │  ├─ repo/               # postgres, redis
│  │  ├─ bus/                # kafka/nats
│  │  └─ ext/                # clientes a otros servicios
│  └─ config/                # carga de env, flags
├─ pkg/                      # utilidades específicas del servicio
├─ migrations/               # sql/atlas/flyway
├─ tests/
│  ├─ unit/
│  └─ integration/
├─ api/
│  ├─ openapi.yaml
│  └─ proto/
├─ Dockerfile
├─ helm/                     # chart del servicio
├─ k8s/                      # kustomize overlays
├─ .env.example
└─ README.md
```

# 3) Frontends

```
apps/web-app/                # Monorepo JS/TS (pnpm)
├─ src/
├─ public/
├─ vite.config.ts
└─ package.json

apps/web-soporte/
apps/mobile-app/             # React Native/Flutter
```

# 4) Premisas de creación de archivos

## Naming y layout

* Kebab-case para carpetas (`assembly-service`), PascalCase para tipos, snake\_case en SQL.
* `cmd/server/main.*` como entrypoint único.
* Un handler por archivo. Máx 300 líneas por archivo objetivo.
* DTOs en `adapters/http/dto/*`. No exponer entidades de dominio.

## Contratos primero

* PRs que cambian API deben actualizar `api/openapi/*.yaml` y ejemplos.
* Generar SDKs cliente desde OpenAPI/proto en CI y publicar en `packages/*-sdk`.

## Configuración

* Variables env con prefijo por servicio: `ASM_`, `AUTH_`, etc. Separar host vs contenedor (`HOST_DB_HOST`, `HOST_DB_PORT` vs `DB_HOST`, `DB_PORT`).
* Plantilla `.env.example` obligatoria con placeholders (`CHANGE_ME_*`), sin credenciales reales.
* Centralizar defaults en `internal/config/` (futuro) con tipado y validación (Zod / env-safe).
* Nuevos endpoints operativos en auth-service: `/health` y `/metrics`.

## Seguridad

* Sin secretos en repo. Usar secretos de CI y vault.
* TLS obligatorio. JWT verificado en gateway y servicio.
* Logs sin PII. Redactar tokens y documentos.

## Persistencia

* Migraciones del auth-service se movieron a carpeta limpia `migrations_clean/` para resolver corrupción histórica.
* Convención: solo archivos autogenerados (timestamp + slug). No mezclar nombres manuales (`001_`, etc.).
* Índices/constraints declarados junto al schema base (users, user_roles, audit_security).
* Próximo (T2): patrón outbox y migraciones de performance (índices adicionales, particiones si aplica).
* Cada caso de uso encapsulado en transacciones atómicas (pendiente refactor capa app).

## Testing

* Cobertura mínima 80% en `internal/app` y `domain`.
* Tests de contrato para HTTP/gRPC con snapshots.
* Pruebas de migraciones en CI.

## Observabilidad

* Logging estructurado (pino + pino-http) con correlación `x-request-id`.
* Health check: `/health` valida DB y Redis (status ok/degraded).
* Métricas expuestas en `/metrics` (Prometheus):
  - `auth_http_requests_total{method,route,status}`
  - `auth_http_request_duration_seconds` (histogram)
  - Métricas por defecto Node (GC, heap, event loop)
* Métricas de negocio (implementadas en auth-service: login_success_total, login_fail_total, password_reset_requested_total, password_reset_completed_total, refresh_rotated_total, refresh_reuse_blocked_total) – exportadas junto a métricas técnicas.
  Definiciones:
  - auth_login_success_total: Incrementa en login válido (200) tras verificación de hash.
  - auth_login_fail_total: Incrementa en intento de login con credenciales inválidas (401).
  - auth_password_reset_requested_total: Incrementa al generar token de recuperación (forgot-password).
  - auth_password_reset_completed_total: Incrementa al completar cambio de contraseña (reset-password).
  - auth_refresh_rotated_total: Rotaciones exitosas de refresh token.
  - auth_refresh_reuse_blocked_total: Intentos bloqueados de reutilizar un refresh rotado.
* Rotación refresh: detección de reuse en test (in-memory) y en producción marcada vía Redis (`rotated:<jti>` TTL corto).
* Backlog: lockouts definitivos, tracing OTel con spans y atributos (`tenant_id`, `user_id`).

## Documentación

* README por servicio con: run local, env, puertos, dependencias.
* ADR en `docs/design/adr/yyyymmdd-title.md`.
* Diagramas Mermaid en `docs/design/diagrams/*.md`.

## Calidad

* Lint y format en pre-commit (`golangci-lint` / `eslint` / `ktlint`).
* Convenciones de commit: Conventional Commits.
* Revisiones obligatorias por CODEOWNERS.

## Versionado y releases

* SemVer por servicio.
* Tags por servicio: `assembly-service/v1.2.3`.
* Changelogs autogenerados desde commits.

## Branching

* `main` protegida.
* `release/*` estabiliza.
* `feat/*`, `fix/*`, `chore/*` por tarea.

## CI/CD

* Workflow auth-service actualizado: jobs `quality`, `tests`, `security_audit`, `summary`.
* Incluye: lint, build (type-check), migraciones limpias, tests con cobertura, smoke `/health`, audit dependencias.
* Próximos pasos: build/publish imagen, helm lint, SBOM (Syft), escaneo Trivy, firma cosign, gating de cobertura.
* Recomendado: publicar cobertura a Codecov / Sonar y activar dependabot.

## Seguridad supply-chain

* Firmar imágenes (cosign).
* Policy admission (Kyverno): no-run-as-root, readOnlyRootFs.
* Escaneo dependencias semanal.

# 5) Makefile (targets estándar)

```
make bootstrap        # instala toolchains locales
make gen              # genera SDKs desde openapi/proto
make lint             # linters todos los paquetes
make test             # unit + integration
make build            # binarios
make docker           # build imagen local
make migrate-up       # migraciones
make run              # docker compose local
make docs             # compila docs API a HTML
```

# 6) Docker Compose local (extracto)

```
services:
  postgres:
    image: postgres:16
    env_file: .env
  redis:
    image: redis:7
  nats:
    image: nats:2
  assembly-service:
    build: ./apps/services/assembly-service
    env_file: apps/services/assembly-service/.env.example
    depends_on: [postgres, redis, nats]
```

# 7) CODEOWNERS (ejemplo)

```
/apps/services/assembly-service/   @team-assembly
/apps/services/auth-service/       @team-auth
/api/openapi/assembly.yaml         @team-assembly @platform
/infra/**                          @platform
```

# 8) Plantillas mínimas

**ADR**

```
# ADR-YYYYMMDD: Título
Contexto
Decisión
Alternativas
Consecuencias
Estado
```

**README servicio**

```
# Assembly Service
Run local, variables, endpoints, decisiones, SLO, contacto equipo.
```

**PR plantilla**

```
Objetivo
Cambios
Checklist: [ ] OpenAPI actualizado [ ] Tests [ ] Migraciones
Riesgos
```

# 9) Línea base por servicio (carpetas obligatorias)

* `api/`, `migrations/`, `internal/app|domain|adapters|config/`, `tests/`, `helm/`, `k8s/`.
* OpenAPI válido, ejemplos en `docs/api/examples/`.
* Alertas SRE definidas en `ops/sre/alerts/*.yaml`.

# 10) Reglas de integración entre servicios

* Comunicación sincrónica vía HTTP/gRPC solo en lectura o validaciones rápidas.
* Escritura y orquestación por eventos (Kafka/NATS) con outbox.
* Idempotencia por `x-request-id` y `event-id` (auth-service ya propaga `x-request-id`).
* Gobernanza (unidades, delegaciones, unicidad admin) exclusiva de `tenant-service`; Auth no expone endpoints de transferencia/delegación.
* JWT minimalista: sólo claims globales + roles agregados. Detalle de unidades/posiciones se obtiene on-demand de `tenant-service`.

## Flujo Estándar Creación / Contexto de Usuario

1. `POST /register` (Auth Service) crea identidad y hash.
2. User Service guarda/actualiza perfil (opcional en la misma saga) y produce `user.created`.
3. Tenant Service asocia el usuario a un tenant (membership global) y luego, si procede, a unidades concretas (`/units/{id}/memberships`).
4. Roles de junta / gobernanza (admin/presidente/vicepresidente/tesorero) se gestionan en Tenant Service (transfer/delegate). Auth sólo consume contexto.
5. Auth en login/refresh consulta (o cachea) `/tenant-context` para claims ligeros (`t_roles`, `tenant_ctx_version`).
6. Servicios consumidores (Assembly, etc.) enriquecen permisos consultando directamente a Tenant Service cuando necesitan granularidad (p.ej. quórum por unidad).

Principios:
* Separación de dominios: identidad (Auth/User) vs estructura/gobernanza (Tenant).
* Context versionado para evitar recargar datos en cada refresh.
* Eventos como fuente de sincronización (outbox): `user.created`, `tenant.created`, `membership.added`, `governance.changed`.

## Seguridad (Auth Service)

* Hashing: Argon2id con parámetros configurables (`AUTH_ARGON2_*`).
* JWT: Access (`AUTH_JWT_ACCESS_TTL` default 900s) + Refresh (`AUTH_JWT_REFRESH_TTL` default 30d) con secretos separados.
* Rotación de refresh tokens: endpoint `POST /refresh-token` invalida el anterior y emite nuevo par (tested).
* Revocación: refresh antiguo se mueve a lista revocada en Redis (`revoked:<jti>`); pendiente revocar access anticipadamente vía lista corta + endpoint de logout que invalide refresh actual.
* Rate limiting: `express-rate-limit` + guardia brute force Redis por email+IP (con métricas planeadas de lockouts).
* Endpoints afectados: `/login` (emite tokens), `/refresh-token` (rotación), `/logout` (pendiente invalidar refresh activo), `/register` (hash Argon2).
* Variables clave: `AUTH_JWT_ACCESS_SECRET`, `AUTH_JWT_REFRESH_SECRET`, `AUTH_JWT_ACCESS_TTL`, `AUTH_JWT_REFRESH_TTL`.
* Retries exponenciales, DLQ por servicio (pendientes de instrumentar en bus/eventos).

## Estado actual de pruebas (auth-service)

* Suites: 10/10 pasando (unit + integration).
* Estrategia: Jest serial (`--runInBand`), Argon2 con parámetros reducidos en test para velocidad.
* Mock Redis: uso de mock global para operaciones generales + in-memory específico para tokens de password reset (evita condiciones de import timing).
* Próximos test a añadir: rotación de refresh token negativa (refresh reutilizado), métricas expuestas, contrato OpenAPI snapshot.

## Próximos pasos priorizados

1. OpenAPI y ejemplos sync para auth-service (contratos primero).
2. Métricas de negocio adicionales: lockouts, refresh rotations, revoked tokens.
3. Tracing OTel end-to-end y propagación `x-request-id` a eventos futuros.
4. Outbox + publicación de eventos de `UserRegistered`, `PasswordChanged`.
5. Pipeline de imagen: build/push, SBOM (Syft), Trivy, firma cosign.
6. ADR inicial: elección Argon2id + separación access/refresh.
7. Diagramas (C4 nivel 2 servicio Auth + secuencia login/refresh/logout).

## Nuevos Diagramas (2025-09-15)

Referencias añadidas en `docs/design/diagrams/`:

- `testing-architecture.mmd`: Aislamiento multi-proyecto Jest y teardown.
- `jwks-rotation-state.mmd` + `jwks-rotation-sequence.mmd`: Ciclo de vida y flujo de rotación JWKS.
- `observability-roadmap.mmd`: Gantt de instrumentación (logs → tracing → alertas → correlación).
- `auth-metrics-flow.mmd`: Generación e incrementos de métricas negocio Auth.
- `security-priorities.mmd`: Cadena priorizada de seguridad (JWKS → gateway → métricas → tracing → eventos → logout → WebAuthn).

Backlog diagramas futuros: `schema-validation-flow.mmd`, `contract-testing-flow.mmd`, `supply-chain-security.mmd`, `tracing-span-map.mmd`.

Coherencia documental: cualquier modificación sustancial en mocks, métricas o prioridades debe reflejarse en `README.md` (raíz + este), `spec.md`, `status.md` y en la lista de diagramas.
