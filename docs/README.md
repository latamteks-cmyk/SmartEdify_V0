Estructura monorepo y premisas. Objetivo: entrega rápida, calidad constante, auditoría simple.

> Snapshot estratégico actualizado: ver `docs/status.md` (2025-09-17). Arquitectura consolidada en `docs/architecture/overview.md`. Backlog priorizado en `docs/roadmap.md`.

# 1) Estructura de carpetas (top-level)

```
smartedify/
├─ ARCHITECTURE.md
├─ README.md
├─ api/
│  └─ openapi/
├─ apps/
│  └─ services/
│     ├─ assembly-service/    # Documentación/contratos iniciales
│     ├─ auth-service/        # Express + Postgres + Redis (JWKS, métricas, tracing)
│     ├─ tenant-service/      # Fastify + Postgres + outbox/DLQ + Kafka stub
│     └─ user-service/        # CRUD en memoria
├─ docs/
├─ plans/
├─ scripts/
├─ docker-compose.yml
├─ package-lock.json
└─ (otros artefactos auxiliares: diagramas en docs/design, scripts dev)
```

Carpetas planificadas (no existen todavía): `packages/`, `infra/`, `ops/`, `tools/`, un `db/` centralizado y frontends (`apps/web-*`, `apps/mobile-*`). Su incorporación y alcance se documentan en `docs/roadmap.md`.

# 2) Plantilla de servicio (apps/services/\*-service)

```
*-service/
├─ api/
│  └─ openapi/               # YAML/JSON por servicio (Auth/Tenant hoy)
├─ cmd/
│  └─ server/main.ts         # Entrypoint Express/Fastify
├─ internal/
│  ├─ adapters/              # http/, repo/, publisher/, consumer/, security/
│  ├─ app/                   # Casos de uso (según madurez)
│  ├─ domain/                # Modelos, eventos, validaciones
│  ├─ metrics/               # Registro Prometheus
│  ├─ observability/         # Tracing/log setup
│  └─ config/                # Carga/env (Auth pendiente de refactor)
├─ migrations/               # SQL forward-only (`auth` añade `migrations_clean/`)
├─ tests/
│  ├─ integration/
│  └─ unit/                  # suites adicionales según servicio
├─ package.json / package-lock.json
├─ tsconfig.json
├─ jest.config.js o vitest.config.ts
├─ Dockerfile
├─ .env.example
└─ README.md
```

Helm charts, overlays `k8s/` y librerías compartidas `pkg/` aún no se han creado; documentados como roadmap en `docs/architecture/overview.md` y `docs/roadmap.md`.

# 3) Frontends

**Frontends (roadmap)**: aún no existen repositorios `apps/web-*` ni `apps/mobile-*`. Los requerimientos iniciales viven en `docs/user-portal-squarespace.md` y se activarán cuando el roadmap lo priorice.

# 4) Premisas de creación de archivos

## Naming y layout

* Kebab-case para carpetas (`assembly-service`), PascalCase para tipos, snake\_case en SQL.
* `cmd/server/main.*` como entrypoint único.
* Un handler por archivo. Máx 300 líneas por archivo objetivo.
* DTOs en `adapters/http/dto/*`. No exponer entidades de dominio.

## Contratos primero

* PRs que cambian API deben actualizar `api/openapi/*.yaml` y ejemplos.
* Generar SDKs cliente desde OpenAPI/proto en CI y publicar en `packages/*-sdk` (pendiente; se detalla en el roadmap).

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
* Tenant-service ya opera con outbox + DLQ; Auth/User deben adoptarlo (ver `docs/roadmap.md`).
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
* Backlog: lockouts definitivos y ampliar spans/atributos OTel (`tenant_id`, `user_id`, eventos consumer). La base de tracing ya está activa en Auth y Tenant.

## Documentación

* README por servicio con: run local, env, puertos, dependencias.
* ADR en `docs/design/adr/yyyymmdd-title.md`.
* Diagramas Mermaid en `docs/design/diagrams/*.md`.

## Calidad

* Configurar hooks de pre-commit (`eslint`, formatters) es backlog; hoy se ejecuta vía CI (`npm run lint`).
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

# 5) Comandos útiles (no hay Makefile aún)

```
npm --prefix apps/services/auth-service run lint
npm --prefix apps/services/auth-service test -- --runInBand --coverage
npm --prefix apps/services/tenant-service run dev
npm --prefix apps/services/tenant-service run test   # vitest (cuando se active)
pwsh -File scripts/dev-up.ps1                        # arranque db/redis en Windows
docker compose up db redis                          # contenedores base (Linux/Mac)
```

# 6) Docker Compose local (extracto)

```
services:
  redis:
    image: redis:7.2-alpine
    ports:
      - "${REDIS_PORT:-6639}:6379"

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-CHANGE_ME_DB_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-CHANGE_ME_DB_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-smartedify}
    ports:
      - "${PGPORT:-5542}:5432"

  auth-service:
    build: ./apps/services/auth-service
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  user-service:
    build: ./apps/services/user-service
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
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

* `api/`, `migrations/`, `internal/{adapters,domain,metrics,observability}`, `tests/` y `cmd/server/` son obligatorios hoy.
* `helm/`, `k8s/`, `ops/` y librerías compartidas quedan como backlog (ver `docs/roadmap.md`).
* Mantener OpenAPI actualizado en `api/openapi/*.yaml`; los ejemplos versionados se documentarán junto al contrato.
* Alertas SRE (`ops/sre/alerts/*.yaml`) y tooling asociado aún no existen.

# 10) Reglas de integración entre servicios

* Comunicación sincrónica vía HTTP/gRPC solo en lectura o validaciones rápidas.
* Escritura y orquestación por eventos (Kafka/NATS) con outbox.
* Idempotencia por `x-request-id` y `event-id` (auth-service ya propaga `x-request-id`).
* Gobernanza (unidades, delegaciones, unicidad admin) exclusiva de `tenant-service`; Auth no expone endpoints de transferencia/delegación.
* JWT minimalista: sólo claims globales + roles agregados. Detalle de unidades/posiciones se obtiene on-demand de `tenant-service`.

## Flujo Estándar Creación / Contexto de Usuario

1. `POST /register` (Auth Service) crea identidad y hash.
2. User Service (hoy en memoria) debe guardar/actualizar perfil y, en roadmap, emitir `user.created`.
3. Tenant Service asocia el usuario a un tenant (membership global) y luego, si procede, a unidades concretas (`/units/{id}/memberships`).
4. Roles de junta / gobernanza (admin/presidente/vicepresidente/tesorero) se gestionan en Tenant Service (transfer/delegate). Auth sólo consume contexto.
5. Auth en login/refresh consultará (cuando se habilite) `/tenant-context` para claims ligeros (`t_roles`, `tenant_ctx_version`).
6. Servicios consumidores (Assembly, etc.) enriquecen permisos consultando directamente a Tenant Service cuando necesitan granularidad (p.ej. quórum por unidad).

Principios:
* Separación de dominios: identidad (Auth/User) vs estructura/gobernanza (Tenant).
* Context versionado para evitar recargar datos en cada refresh.
* Eventos como fuente de sincronización (outbox): `tenant.created` ya emite Tenant; `user.created`, `membership.added`, `governance.changed` están planificados.

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

Coherencia documental: cualquier modificación sustancial en mocks, métricas o prioridades debe reflejarse en `README.md` (raíz + este), `docs/architecture/overview.md`, `docs/status.md`, `docs/roadmap.md` y en la lista de diagramas.
