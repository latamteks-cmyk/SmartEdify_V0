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

### Observabilidad local (OpenTelemetry + Prometheus)
- Para habilitar la recolección de métricas y trazas ejecuta:
  ```sh
  docker compose up -d otel-collector prometheus
  ```
- Endpoints expuestos por el collector (puertos configurables mediante variables de entorno):
  - OTLP gRPC: `localhost:${OTEL_COLLECTOR_GRPC_PORT:-4317}`.
  - OTLP HTTP para traces: `http://localhost:${OTEL_COLLECTOR_HTTP_PORT:-4318}/v1/traces`.
  - OTLP HTTP para métricas: `http://localhost:${OTEL_COLLECTOR_HTTP_PORT:-4318}/v1/metrics`.
  - Métricas Prometheus: `http://localhost:${OTEL_COLLECTOR_PROM_PORT:-8889}/metrics`.
- Interfaz de Prometheus para explorar series: `http://localhost:${PROMETHEUS_PORT:-9090}`.

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
### Tests ✅ **ESTADO ACTUALIZADO - OAUTH 100% FUNCIONAL**
  - Auth Service (Jest multi-proyecto) - **47/47 tests pasando**:
    - Windows (PowerShell):
      ```powershell
      cd c:\Edgar\Programacion\SmartEdify_A\SmartEdify_V0
      npm run test:auth:win
      ```
    - Nix (bash/zsh):
      ```bash
      cd ./SmartEdify_V0
      npm run test:auth:nix
      ```
    - **🎯 Hito OAuth**: Test de revocación completamente funcional tras corrección de seguridad
    - **Validación robusta**: Tipos de token validados, almacén en memoria para tests
    - **CVE Mitigado**: Cerrada vulnerabilidad de intercambio de tipos de token
    - Notas:
      - Usa mocks de Postgres/Redis con `SKIP_DB_TESTS=1` y requiere `AUTH_ADMIN_API_KEY` para endpoints admin en tests.
      - En entorno de test, `/health` devuelve `200`.
      - **Documentación completa**: [OAuth Revocation Fix](docs/auth/oauth-revocation-fix.md)
  - Tenant Service (Vitest):
    ```sh
    npm --prefix apps/services/tenant-service run test
    npm --prefix apps/services/tenant-service run test:integration
    ```
  - Contratos HTTP (Schemathesis):
    ```sh
    python -m pip install -r requirements-schemathesis.txt
    npm run contract:auth:schemathesis
    npm run contract:tenant:schemathesis
    ```
    - Los wrappers inician cada servicio con `SKIP_DB_TESTS=1`, esperan `/health` y ejecutan un smoke test sobre el contrato (`/health`).
    - Los reportes JUnit se guardan en `reports/contracts/` y pueden subirse como artefactos en CI.

### Ejecución rápida de tests (scripts raíz)
  - Ejecuta los suites soportados desde la raíz:
    ```bash
    npm run test:fast
    npm run test:contract
    npm run test:all
    ```
  - El wrapper `scripts/run-test-suite.mjs` detecta automáticamente si estás en Windows (`process.platform === 'win32'`) o en un entorno Nix y delega en los scripts internos (`test:<suite>:win|nix`).

### Quality gates para PRs
El pipeline valida:
  - `lint` y `typecheck` en servicios modificados.
  - `tests` unitarios/contrato (auth) y smoke (tenant) en CI.
  - **🎯 OAuth Security**: Validación completa del flujo OAuth 2.0 incluyendo revocación
  - Validación de diagramas Mermaid.
  - Linting de OpenAPI con Spectral.

Objetivos próximos: cobertura ≥80 % como gate; SAST y verificación de firmas (Cosign) como gates bloqueantes.

**Estado actual de testing**:
- ✅ **Auth Service**: 47/47 tests pasando (100%) - OAuth completamente funcional
- ✅ **Tenant Service**: Tests de integración estables  
- ✅ **User Service**: Tests básicos funcionando
- 📋 **Próximo**: Contract testing completo y gates de cobertura

## Feature Highlights
### Observabilidad y tracing distribuido
- Auto-instrumentación de HTTP, Express/Fastify y PostgreSQL con OpenTelemetry.
- Spans manuales para `kafka.publish`, `outbox.tick` y `outbox.publish`.
- Logs enriquecidos con `trace_id` y `span_id` en auth-service, con roadmap para sampling adaptativo.

### 🔐 Rotación de JWKS y seguridad JWT robusta
- **OAuth 2.0 completamente funcional**: Test de revocación 100% pasando tras corrección crítica de seguridad
- **Validación de tokens robusta**: Tipos de token validados para prevenir bypass de autenticación
- **CVE Mitigado**: Cerrada vulnerabilidad potencial de escalada de privilegios por intercambio de tipos
- Diseño documentado en `docs/design/adr/ADR-0007-jwks-rotation.md` con flujo de estados `current`, `next` y `retiring`.
- Periodo de gracia para validar tokens antiguos y revocación de refresh tokens ante compromisos.
- Métricas previstas: `jwks_keys_total{status}` y `jwks_rotation_total`.
- **Documentación completa**: [OAuth Security Fix](docs/auth/oauth-revocation-fix.md)

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
- [docs/testing.md](docs/testing.md) — estrategia unificada de testing y estado actual.
- [docs/operations/ci-cd.md](docs/operations/ci-cd.md) — guía de pipeline de CI/CD.
- [docs/docker.md](docs/docker.md) — stack local y gestión de credenciales de registros.
- [SECURITY.md](SECURITY.md) — política de seguridad y divulgación responsable.
- **🔐 [docs/auth/oauth-revocation-fix.md](docs/auth/oauth-revocation-fix.md)** — corrección crítica OAuth y análisis de seguridad.
- Directorios especializados: `docs/observability/`, `docs/design/`, `docs/security-hardening.md`, `docs/runbooks/`.

## Seguridad de contenedores y límites de recursos
- Los servicios propios (`auth-service`, `user-service`, `tenant-service`) crean un usuario sin privilegios (`app`, UID/GID 1001) durante la construcción de la imagen y se ejecutan con ese contexto mediante `docker-compose`. Esto reduce el impacto de un compromiso al evitar permisos de root dentro del contenedor y mantiene la coherencia con los ficheros generados en volúmenes compartidos.
- Las imágenes de terceros se fuerzan a ejecutarse con cuentas sin privilegios conocidas: Redis y Postgres usan `999:999` (usuarios provistos en las imágenes oficiales), Prometheus se ejecuta como `65534:65534` (`nobody`) y el collector de OpenTelemetry se limita a `1000:1000` porque solo necesita acceso de lectura al fichero de configuración montado. Cualquier despliegue puede adaptar estos valores mediante variables de entorno si necesita otra política de control de acceso.
- Se definieron límites de CPU y memoria por servicio para evitar que un proceso agote recursos del host durante pruebas locales:

  | Servicio | CPU (máx) | Memoria (máx) | Justificación |
  | --- | --- | --- | --- |
  | Redis | 0.50 | 256 MiB | Cache ligera y colas in-memory, con consumo predecible. |
  | Postgres | 1.50 | 1 GiB | Necesita más recursos para migraciones y consultas complejas. |
  | Auth Service | 0.75 | 512 MiB | API HTTP con hashing y validación de tokens. |
  | User Service | 0.75 | 512 MiB | Cargas similares a Auth para endpoints CRUD. |
  | OTEL Collector | 0.50 | 256 MiB | Recolección y reenvío de trazas; suficiente para entornos locales. |
  | Prometheus | 1.00 | 512 MiB | Scraping periódico y retención corta en desarrollo. |

- Los límites sirven como base para entornos de desarrollo; en producción deben ajustarse a los perfiles reales de carga y, en caso de usar Swarm/Kubernetes, complementarse con peticiones (`requests`) y alertas de saturación.

## Licencia
Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## Contribuciones
1. Abre un issue o referencia una entrada en `docs/tareas.md` antes de iniciar trabajo.
2. Sigue los linters y pruebas (`npm run lint`, `npm test`) en cada servicio modificado.
3. Actualiza la documentación relacionada (README, spec, status) dentro de la misma PR cuando cambies contratos o métricas.
4. Para diagramas Mermaid, sigue `docs/design/diagrams/README.md` y ejecuta `npm run lint:mermaid` antes de solicitar revisión.
