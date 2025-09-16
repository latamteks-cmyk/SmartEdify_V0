# SmartEdify

## Overview
SmartEdify es una plataforma modular orientada a servicios (Auth, Tenant, User, Assembly) que prioriza la observabilidad, la seguridad y la consistencia de datos. Los servicios comparten prácticas comunes (tracing distribuido, contratos de eventos, pipelines de consumo resilientes) y se orquestan mediante Docker Compose para entornos locales.

## Prerequisites
- Node.js 18+ y npm 9+ (para construir y ejecutar los servicios TypeScript).
- Docker 24+ y Docker Compose v2 (para infraestructura local: Postgres, Redis y servicios opcionales).
- PowerShell 7+ (opcional) para ejecutar scripts de conveniencia en Windows (`scripts/dev-up.ps1`).
- Acceso a un registro de contenedores (Docker Hub u otro) si vas a publicar imágenes.

## Installation
1. Clona el repositorio y crea tu propio fichero de variables de entorno:
   ```sh
   git clone https://github.com/SmartEdify/SmartEdify_V0.git
   cd SmartEdify_V0
   cp .env.example .env
   ```
2. Completa los valores `CHANGE_ME_*` de tu `.env` con credenciales reales antes de levantar contenedores.
3. Instala dependencias por servicio (ejemplos):
   ```sh
   npm --prefix apps/services/auth-service install
   npm --prefix apps/services/tenant-service install
   npm --prefix apps/services/user-service install
   ```
4. Compila y ejecuta migraciones donde aplique:
   ```sh
   npm --prefix apps/services/auth-service run build
   npm --prefix apps/services/auth-service run migrate
   ```

## Usage
### Arranque de infraestructura local
- Para levantar Redis y Postgres ejecuta:
  ```sh
  docker compose up -d db redis
  ```
  Consulta [docs/docker.md](docs/docker.md#stack-local-persistencia-y-servicios) para detalles de puertos, variables de entorno y el script `scripts/dev-up.ps1` que automatiza healthchecks y migraciones.

### Ejecutar servicios
- Auth Service:
  ```sh
  npm --prefix apps/services/auth-service run start
  # o modo desarrollo
  npm --prefix apps/services/auth-service run dev
  ```
- Tenant Service:
  ```sh
  npm --prefix apps/services/tenant-service run dev
  ```
- Otros servicios siguen el mismo patrón (`run build`, `run start`, `run dev`).

### Tests
- Auth Service (Jest multi-proyecto):
  ```sh
  npm --prefix apps/services/auth-service test
  npm --prefix apps/services/auth-service run test:proj:integration
  ```
- Tenant Service (Vitest):
  ```sh
  npm --prefix apps/services/tenant-service run test
  npm --prefix apps/services/tenant-service run test:integration
  ```

## Feature Highlights
### Observabilidad y tracing distribuido
- Auto-instrumentación de HTTP, Express/Fastify y PostgreSQL con OpenTelemetry.
- Spans manuales para `kafka.publish`, `outbox.tick` y `outbox.publish`.
- Logs enriquecidos con `trace_id` y `span_id` en auth-service, con roadmap para sampling adaptativo.

### Rotación de JWKS y seguridad JWT
- Diseño documentado en `docs/design/adr/ADR-0007-jwks-rotation.md` con flujo de estados `current`, `next` y `retiring`.
- Periodo de gracia para validar tokens antiguos y revocación de refresh tokens ante compromisos.
- Métricas previstas: `jwks_keys_total{status}` y `jwks_rotation_total`.

### Validación de esquemas de eventos
- Registro `eventType@version` en `tenant-service` (`internal/domain/event-schemas.ts`) usando Zod.
- Validación previa a publicaciones (logging/kafka) para impedir envíos con payload inválido.
- Roadmap de versionado y tipado incremental.

### Procesamiento de eventos y resiliencia
- Pipeline `KafkaLagConsumer` + `KafkaProcessingConsumer` con backoff exponencial y límites de concurrencia.
- Métricas clave: `consumer_events_processed_total`, `consumer_process_duration_seconds`, `consumer_retry_attempts_total`, `consumer_handler_not_found_total`.
- Variables de entorno configurables (`CONSUMER_MAX_RETRIES`, `CONSUMER_RETRY_BASE_DELAY_MS`, `CONSUMER_RETRY_MAX_DELAY_MS`).

### Roles granulares y gobernanza
- Tablas `role_definitions` y `role_assignments` para roles específicos por tenant.
- Endpoint `/tenant-context` combina roles de gobierno y asignaciones dinámicas, con hash de versión para cacheo en clientes.

## Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) — visión general de la plataforma.
- [docs/spec.md](docs/spec.md) — especificación técnica consolidada.
- [docs/status.md](docs/status.md) — snapshot ejecutivo y estado de entregables.
- [docs/operations/ci-cd.md](docs/operations/ci-cd.md) — guía de pipeline de CI/CD.
- [docs/docker.md](docs/docker.md) — stack local y gestión de credenciales de registros.
- [SECURITY.md](SECURITY.md) — política de seguridad y divulgación responsable.
- Directorios especializados: `docs/observability/`, `docs/design/`, `docs/security-hardening.md`, `docs/runbooks/`.

## Contribuciones
1. Abre un issue o referencia una entrada en `docs/tareas.md` antes de iniciar trabajo.
2. Sigue los linters y pruebas (`npm run lint`, `npm test`) en cada servicio modificado.
3. Actualiza la documentación relacionada (README, spec, status) dentro de la misma PR cuando cambies contratos o métricas.
