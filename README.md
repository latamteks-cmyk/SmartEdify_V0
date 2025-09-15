# SmartEdify

Plataforma modular de servicios (Auth, User, etc.).

## Tracing Distribuido (OpenTelemetry)
Soporte actual (Auth + Tenant):
- Auto-instrumentación HTTP/Express/Fastify/PostgreSQL vía `@opentelemetry/sdk-node`.
- Spans manuales `kafka.publish`, `outbox.tick`, `outbox.publish`, correlando `tenant_id` y `event.type`.
- Logs enriquecidos con `trace_id`/`span_id` en auth-service y tenant-service cuando existe span activo.
Próximas fases: spans en consumer handlers, métricas de saturación (`consumer_inflight`), sampling adaptativo y propagación completa `x-request-id`→`trace_id` entre servicios.

## JWKS Rotation (Claves JWT)
Implementado según ADR-0007 (`docs/design/adr/ADR-0007-jwks-rotation.md`). Flujo (ver diagrama `jwks-rotation-sequence.mmd`):
- Estados de clave: `current`, `next`, `retiring`, `expired` almacenados en `auth_signing_keys` (Postgres).
- Endpoint público `/.well-known/jwks.json` y endpoint administrativo `/admin/rotate-keys` (pendiente endurecer auth) con métricas `auth_jwks_keys_total{status}` y `auth_jwks_rotation_total`.
- Revocación de refresh tokens al rotar (`auth_refresh_rotated_total`, `auth_refresh_reuse_blocked_total`).
- Backlog: cron de rotación automática, expiración `retiring→expired` y protección del endpoint administrativo.

## Schema Validation de Eventos
Módulo inicial `internal/domain/event-schemas.ts` (tenant-service) usando Zod.
- Registro por `eventType@version` (ej: `tenant.created@1`).
- Publishers (logging/kafka) validan antes de enviar; si falla no se publica y el outbox marca fallo permanente.
- A extender con tipos adicionales y versionado futuro.

## Estructura
```
apps/
  services/
    auth-service/      # Express + Postgres + Redis + JWKS + Jest multiproyecto
    tenant-service/    # Fastify + Postgres + Outbox/DLQ + Kafka publisher stub + Vitest
    user-service/      # CRUD en memoria (pendiente migración a Postgres)
    assembly-service/  # Documentación/contratos iniciales
docs/                  # Arquitectura, ADRs, auditorías, roadmap, status
api/                   # OpenAPI y proto por servicio
scripts/               # Scripts soporte (`dev-up.ps1`, etc.)
docker-compose.yml     # Postgres + Redis para desarrollo
```

## Desarrollo rápido (Auth Service)
```powershell
# Instalar dependencias
npm --prefix apps/services/auth-service install

# Build
npm --prefix apps/services/auth-service run build

# Migraciones
npm --prefix apps/services/auth-service run migrate

# Ejecutar
npm --prefix apps/services/auth-service start
```

## Contenedores locales
```powershell
docker compose up -d db redis
# (Después de migraciones y build) opcionalmente levantar servicios
```

## Variables de entorno
Ver `.env.example` y copiar a `.env` (no commitear `.env`).

### Mapeo de Puertos (Host ↔ Contenedor)
Los puertos deben estar alineados con las variables declaradas en `./.env` (fuente de verdad). El script `scripts/dev-up.ps1` carga primero `./.env` y luego levanta `db` y `redis`. Tras el arranque:

1. Valida healthchecks.
2. Aplica la migración `001_create_auth_signing_keys.sql` si falta.
3. Exporta variables a la sesión actual de PowerShell.
4. Comprueba el puerto host publicado vs el valor en `.env` y emite ALERTAS si difiere (no adapta silenciosamente).

Ejemplos de uso:
```powershell
# Arranque normal (usa .env existente)
pwsh -File scripts/dev-up.ps1

# Forzar recreación de contenedores (si cambiaste puertos en .env o docker-compose)
pwsh -File scripts/dev-up.ps1 -Recreate

# Reconstruir imágenes sin cache y recrear
pwsh -File scripts/dev-up.ps1 -Rebuild -Recreate
```

Flags soportados:
- `-Rebuild`: fuerza `docker compose build --no-cache` antes de levantar.
- `-Recreate`: elimina contenedores `db` y `redis` para asegurar que el nuevo mapeo respete `.env`.

Política de coherencia:
- Si `PGPORT` (en `.env`) != puerto host publicado para Postgres, se muestra `[ALERTA]` y NO se corrige automáticamente.
- Mismo criterio para `REDIS_PORT`.
- Ajusta `docker-compose.yml` (sección `ports:`) para usar interpolación `${PGPORT}:5432` y `${REDIS_PORT}:6379`.

Estado de ejemplo (solo ilustrativo; puede haber cambiado):
| Servicio   | Puerto Contenedor | Host Port | Variable .env |
|-----------|-------------------|-----------|---------------|
| Postgres  | 5432              | 5433      | `PGPORT`      |
| Redis     | 6379              | 6639      | `REDIS_PORT`  |
| Auth API  | 8080 (interno)    | 9080      | `AUTH_PORT`   |
| User API  | 8081 (interno)    | 9081      | `USER_PORT`   |

Recomendación: si necesitas cambiar puertos, primero edita `.env`, luego ejecuta `scripts/dev-up.ps1 -Recreate`.

### Claves JWT
Para `tenant-service` define `TENANT_JWT_PUBLIC_KEY` con la clave pública usada para firmar tokens (algoritmos soportados RS256/ES256/HS256). Nunca subas la clave privada.

### Credenciales DB
Los valores por defecto en `docker-compose.yml` usan marcadores `CHANGE_ME_*`. Sustituir siempre antes de exponer cualquier entorno fuera de desarrollo.

## Credenciales Docker Hub
Para publicar imágenes necesitas definir un PAT (Personal Access Token) de Docker Hub con permisos de push/pull.

1. Crea un PAT en Docker Hub.
2. Copia `.env.example` a `.env` y completa:
```
DOCKERHUB_USERNAME=tu_usuario
DOCKERHUB_TOKEN=tu_pat
```
3. Inicia sesión localmente (PowerShell):
```powershell
$Env:DOCKERHUB_TOKEN | docker login -u $Env:DOCKERHUB_USERNAME --password-stdin
```
4. En CI agrega secrets `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN` y un paso de login antes de build/push.

Más detalle en `docs/docker-credenciales.md`.

## Próximos pasos (T1)
- Endurecer JWKS: proteger `/admin/rotate-keys`, automatizar cron y publicar alertas si falta clave `next`.
- Implementar outbox Auth (`user.registered`, `password.changed`) y consumer inicial en User Service.
- Entregar delegaciones temporales en Tenant (`/governance/delegate`) con expiración automática y métricas.
- Integrar Spectral + contract tests en CI (Auth + Tenant) y publicar cobertura Vitest/Auth.
- Iniciar migración User Service → Postgres (ADR + primera migración) y definir métricas usuarios activos.
- Añadir SBOM (Syft) + escaneo Trivy en pipelines, preparando firma cosign.

## Seguridad (Resumen de mitigaciones recientes)
1. Eliminadas credenciales hardcodeadas en `docker-compose.yml`.
2. Añadido middleware JWT en `tenant-service` (plugin `auth-jwt`) con soporte JWKS remoto.
3. Backoff exponencial con jitter para la publicación outbox + DLQ con purga y reprocess.
4. Variables sensibles movidas a `.env` (`TENANT_JWT_PUBLIC_KEY`, `TENANT_DB_URL`, `AUTH_JWT_*`).
5. Almacén JWKS asimétrico (`auth_signing_keys`) con métricas `auth_jwks_*` y detección de reuse refresh tokens.

## Roles granulares (Tenant Service)
Se añaden tablas para soportar roles adicionales a 'admin':

- `role_definitions(tenant_id, code, description)` catálogos específicos por tenant.
- `role_assignments(tenant_id, role_code, user_id, revoked_at)` asignaciones activas (cuando `revoked_at IS NULL`).

El endpoint `/tenant-context` ahora devuelve la unión de:
1. Rol de gobierno (admin) activo derivado de `governance_positions`.
2. Roles asignados dinámicamente (`editor`, `viewer`, etc.).

Versión de contexto (`version`) se calcula hash sobre el conjunto de roles ordenados, permitiendo caching en clientes.

## Riesgos pendientes (plan)
- Rotación JWKS sin guardianes automáticos (cron + alertas) y endpoint `/admin/rotate-keys` sin autenticación.
- Falta outbox Auth + coordinación con User/Tenant para eventos `user.registered`.
- Delegaciones de gobernanza (`/governance/delegate`) y motor de políticas pendientes.
- Ausencia de contract tests (Spectral + snapshots) y pipelines Tenant sin cobertura.
- Supply-chain sin SBOM, escaneo Trivy ni firma cosign.
- Hardening de contenedores (usuario no root ya aplicado; falta seccomp/AppArmor y políticas Kyverno).

## Consumer Processing (Tenant Service)
Pipeline de consumo implementado (Fase inicial) para eventos publicados vía outbox + publisher:

1. `KafkaLagConsumer`: monitorea lag (backlog) sin procesar mensajes.
2. `KafkaProcessingConsumer`: procesa mensajes reales con concurrencia limitada y reintentos in‑memory.
3. Registry de handlers por `eventType` simplifica extensión (archivo `consumer-handlers.ts`).
4. Clasificación heurística de errores (transient/permanent) con backoff exponencial + jitter.
5. Métricas clave:
  - `broker_consumer_lag`, `broker_consumer_lag_max`
  - `consumer_events_processed_total{status,type}`
  - `consumer_process_duration_seconds{type}`
  - `consumer_retry_attempts_total{type}`
  - `consumer_inflight`
  - `consumer_handler_not_found_total{type}`

Variables de entorno añadidas (tenant-service):
```
CONSUMER_MAX_RETRIES (default 5)
CONSUMER_RETRY_BASE_DELAY_MS (default 100)
CONSUMER_RETRY_MAX_DELAY_MS (default 2000)
```

Pruebas: `consumer-processing.test.ts` cubre reintentos transitorios y handler ausente.

Próximos pasos: DLQ consumidor, tracing por evento, schema registry.

Diagrama del pipeline: ver `docs/design/diagrams/event-pipeline.mmd` (flowchart Mermaid representando Outbox → Publisher → Kafka → Consumers → Handlers + retries y métricas).

---
Última actualización: 2025-09-17 (alineado con estado actual de Auth/Tenant)

## Estrategia de Tests (Multi‑Proyecto Jest)

El `auth-service` utiliza configuración multi‑proyecto en `jest.config.js`:

- `security`: pruebas de rotación de claves y JWT con mocks de DB/Redis.
- `unit`: (reservado para lógica de dominio pura) sin efectos externos.
- `integration`: flujo completo contra Postgres real (migraciones) y Redis simulado in‑memory.

### Ejecución
```powershell
# Todas las suites
npx jest

# Solo integración
npx jest --selectProjects integration

# Solo seguridad
npx jest --selectProjects security
```

### Mocks
Se evita usar la convención global `__mocks__` para módulos críticos en integración:

- `pg`: NO se mockea en integración. (Se eliminó `tests/__mocks__/pg.ts`).
- `ioredis`: se fuerza a un mock extendido único vía `moduleNameMapper` → `__mocks__/ioredis.ts` que implementa `set/get/del/incr/expire/ttl`.

Pitfall resuelto: la coexistencia de `__mocks__/ioredis.ts` y `tests/__mocks__/ioredis.ts` generó `duplicate manual mock`. Se neutralizó el duplicado y se añadió `modulePathIgnorePatterns`.

### Cierre Limpio de Recursos
`tests/jest.setup.ts` cierra:
- Tracing (OpenTelemetry mock)
- Métricas (`prom-client` register.clear())
- Redis mock (`quit()` si existe)
- Pool Postgres (`endPool()` exportado desde `pg.adapter.ts`)

Si aparece el aviso `Jest did not exit`, ejecutar: 
```powershell
npx jest --selectProjects integration --detectOpenHandles
```
para inspeccionar handles residuales.

### Variables de Entorno en Tests
`.env.test` se carga en `global-setup` para integración antes de migraciones. Asegúrate de definir:
```
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=smartedify
AUTH_LOGIN_WINDOW_MS=60000
```

### Buenas Prácticas Adoptadas
1. No introducir mocks de módulos críticos (DB) en rutas visibles de integración.
2. Forzar mapping explícito para mocks compartidos (Redis) evitando colisiones.
3. Instrumentación temporal (logs) eliminada tras estabilizar.
4. Separación clara de responsabilidades por proyecto Jest para aislar fallos.

---

## Documentación Complementaria
- Especificación técnica consolidada: `docs/architecture/overview.md` (incluye arquitectura de testing y roadmap de observabilidad)
- Estado ejecutivo (snapshot): `docs/status.md`
- Backlog detallado y auditoría de tareas: `docs/roadmap.md`

Nota: cualquier cambio que afecte mocks, contratos API o métricas debe reflejarse en los tres documentos (README, `docs/architecture/overview.md`, `docs/status.md`) dentro de la misma PR.

