# SmartEdify

Plataforma modular de servicios (Auth, User, etc.).

## Tracing Distribuido (OpenTelemetry)
Soporte actual:
- Auto-instrumentación: HTTP, Express/Fastify, PostgreSQL.
- Spans manuales: `kafka.publish`, `outbox.tick`, `outbox.publish`.
- Logs enriquecidos con `trace_id` y `span_id` en auth-service.
Próximas fases: spans en consumer handlers, sampling adaptativo, correlación outbox→consumer.

## JWKS Rotation (Claves JWT)
Diseño en ADR-0007 (`docs/design/adr/ADR-0007-jwks-rotation.md`). Flujo (ver diagrama `jwks-rotation-sequence.mmd`):
- Estados de clave: `current`, `next`, `retiring`.
- Periodo de gracia para validar tokens antiguos con clave `retiring`.
- Revocación de refresh tokens al marcar compromiso.
- Métricas planeadas: `jwks_keys_total{status}`, `jwks_rotation_total`.

## Schema Validation de Eventos
Módulo inicial `internal/domain/event-schemas.ts` (tenant-service) usando Zod.
- Registro por `eventType@version` (ej: `tenant.created@1`).
- Publishers (logging/kafka) validan antes de enviar; si falla no se publica y el outbox marca fallo permanente.
- A extender con tipos adicionales y versionado futuro.

## Estructura
```
apps/
  services/
    auth-service/
    user-service/
Docker
Postgres / Redis
Tenant Service (en progreso)
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
- Hashing de contraseñas (argon2/bcrypt)
- Refactor capa dominio
- Métricas y tracing (OTel)
- Roles DB no-superuser en runtime
 - Endurecer outbox: DLQ, limpieza, TTL, particionado índices
 - Suite de tests tenant-service (unit/integration)

## Seguridad (Resumen de mitigaciones recientes)
1. Eliminadas credenciales hardcodeadas en `docker-compose.yml`.
2. Añadido middleware JWT en `tenant-service` (plugin `auth-jwt`).
3. Backoff exponencial con jitter para la publicación outbox.
4. Ejemplo de variables sensibles movidas a `.env` (`TENANT_JWT_PUBLIC_KEY`, `TENANT_DB_URL`).

## Roles granulares (Tenant Service)
Se añaden tablas para soportar roles adicionales a 'admin':

- `role_definitions(tenant_id, code, description)` catálogos específicos por tenant.
- `role_assignments(tenant_id, role_code, user_id, revoked_at)` asignaciones activas (cuando `revoked_at IS NULL`).

El endpoint `/tenant-context` ahora devuelve la unión de:
1. Rol de gobierno (admin) activo derivado de `governance_positions`.
2. Roles asignados dinámicamente (`editor`, `viewer`, etc.).

Versión de contexto (`version`) se calcula hash sobre el conjunto de roles ordenados, permitiendo caching en clientes.

## Riesgos pendientes (plan)
- Publicación real de eventos (Kafka/NATS) con confirmaciones.
- Estrategia de rotación de claves JWT y JWKS endpoint.
- Retención y archivado de eventos outbox (+ limpieza periódica).
- Observabilidad distribuida (OpenTelemetry traces) y correlation IDs.
- Autorización granular (roles adicionales, delegaciones, scoping por unidad).
- Hardening de contenedores (usuario no root ya aplicado; falta seccomp/AppArmor). 

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
Última actualización: 2025-09-15 (snapshot post estabilización suite integración / prioridad JWKS)

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
- Especificación técnica consolidada: `docs/spec.md` (incluye sección 8 Arquitectura de Testing y roadmap observabilidad)
- Estado ejecutivo (snapshot): `docs/status.md`
- Backlog detallado y auditoría de tareas: `docs/tareas.md`
- Políticas operativas y CI/CD: `docs/operations/ci-cd.md`

Nota: cualquier cambio que afecte mocks, contratos API o métricas debe reflejarse en los tres documentos (README, spec, status) dentro de la misma PR.

