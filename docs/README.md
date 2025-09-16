<a id="documento-rector--smartedify_v0"></a>
# Documento Rector — SmartEdify_V0

## Current — Panorama

### Visión global
Objetivo: plataforma SaaS modular para educación con tres dominios (User Portal, Admin Portal y Mobile App) apoyados por servicios backend desacoplados. El MVP actual se sostiene sobre Auth Service (registro, autenticación y recuperación de credenciales) y Tenant Service Fase 0 (tenants, unidades, memberships y transferencia de administrador) mientras se consolida User Service como proveedor de perfil básico. Las interfaces web y móvil aún no se han entregado; sus historias y checklists UI/UX se gestionan en `docs/tareas.md` (secciones *Web Administrador*, *Web User* y *Aplicación Móvil*).

### Guías consolidadas
Recursos clave para profundizar desde el inicio del proyecto:
- [Lineamientos de arquitectura](architecture/guidelines.md): principios, patrones y convenciones obligatorias a nivel de diseño.
- [Pautas de CI/CD y operaciones](operations/ci-cd.md): expectativas de pipelines, gates de calidad y protocolos de despliegue.

### Áreas críticas detectadas
- JWKS rotation incompleta.
- Broker y DLQ pendientes.
- CI sin gates de cobertura y seguridad en `main`.
- Placeholders sensibles en `.env` y compose.

### Dominios activos
| Dominio | Estado actual | Dependencias actuales |
|---|---|---|
| User Portal | Sin interfaz desplegada; consumo de flujos vía servicios Auth/Tenant mientras se define UI en backlog. | Auth Service, Tenant Service |
| Admin Portal | UI en definición; operaciones de gobierno disponibles vía Tenant Service (`/tenants`, `/governance`). | Auth Service, Tenant Service |
| Mobile App | No iniciada; alcance y navegación documentados en backlog móvil. | Auth Service, Tenant Service |

### Arquitectura global
Resumen en `ARCHITECTURE.md`. Diagramas en `docs/design/diagrams/*`.
Ver `docs/design/diagrams/network-ports.mmd` para puertos y relaciones, y `plans/gateway/gateway-service.md` para el BFF.
Lineamientos completos: ver [Guía de arquitectura unificada](architecture/guidelines.md).

### Catálogo de endpoints activos
Contratos verificados contra los OpenAPI publicados en el repositorio.

#### Auth Service (`api/openapi/auth.yaml`)
Base URL: `https://api.smartedify.com/api/auth/v1`

| Función | Endpoint | Método | Notas |
|---|---|---|---|
| Registrar usuario | `/register` | POST | Registra identidad inicial y devuelve tokens si corresponde. |
| Login | `/login` | POST | Emite par access/refresh tokens. |
| Rotar refresh token | `/refresh-token` | POST | Requiere refresh token vigente en el cuerpo de la solicitud. |
| Solicitar recuperación | `/forgot-password` | POST | Dispara token de reseteo vía canal externo. |
| Confirmar reseteo | `/reset-password` | POST | Valida token de reseteo y actualiza credenciales. |
| Health check | `/health` | GET | Diagnóstico técnico sin autenticación declarada. |
| Métricas | `/metrics` | GET | Exposición Prometheus para observabilidad. |

#### Tenant Service (`apps/services/tenant-service/api/openapi/tenant.yaml`)
Base URL: `https://api.smartedify.io`

| Función | Endpoint | Método | Seguridad |
|---|---|---|---|
| Crear tenant | `/tenants` | POST | `bearerAuth` |
| Obtener tenant | `/tenants/{id}` | GET | `bearerAuth` |
| Crear unidad | `/tenants/{id}/units` | POST | `bearerAuth` |
| Listar unidades | `/tenants/{id}/units` | GET | `bearerAuth` |
| Alta membership | `/units/{id}/memberships` | POST | `bearerAuth` |
| Transferir admin | `/tenants/{id}/governance/transfer-admin` | POST | `bearerAuth` |
| Contexto de tenant | `/tenant-context` | GET | `bearerAuth` |

### Buenas prácticas vigentes
Un servicio = una responsabilidad. Seguridad por defecto. Observabilidad integral. CI/CD con rollback. Límites de costo definidos.
Protocolos detallados en [Política operativa y de CI/CD](operations/ci-cd.md).

### ADRs vigentes
- `ADR-0004` — Publisher & Envelope en outbox para eventos confiables.
- `ADR-0005` — Consumer processing con métricas y retries controlados.
- `ADR-0006` — Estrategia de tracing distribuido (en implementación progresiva).
- `ADR-0007` — Plan de rotación JWKS y gestión de claves.

### Referencias y apéndices
- Snapshot estratégico actualizado: `docs/status.md` (2025-09-15).
- Especificación técnica consolidada: `docs/spec.md`.
- Auditorías periódicas: `docs/audits/2025-09-16-structure.md`.
- Glosario y runbooks ampliados permanecen en elaboración: seguimiento en `docs/tareas.md` (sección Documentación).

## Roadmap — Próximas iteraciones

### Evolución de dominios
- **User Portal**: diseñar y construir flujos UI (registro, perfil, servicios) con criterios de accesibilidad y i18n; ver `docs/tareas.md` → *Web User*.
- **Admin Portal**: priorizar gestión de usuarios, roles y reportes operativos; ver `docs/tareas.md` → *Web Administrador*.
- **Mobile App**: implementar navegación, sesiones seguras y notificaciones push; ver `docs/tareas.md` → *Aplicación Móvil*.

### Priorización por microservicio
- **Auth Service**: rotación JWKS y publicación de endpoints OIDC, métricas de negocio y contract tests (`docs/status.md`, `docs/tareas.md` → Auth Service).
- **Tenant Service**: completar CRUD de unidades/memberships, delegaciones temporales y gauges de contexto (`docs/status.md`, `docs/tareas.md` → Tenant Service).
- **User Service**: formalizar contratos OpenAPI, persistencia Postgres y eventos `user.created` (`docs/status.md`, `docs/tareas.md` → User Service).
- **Assembly Service**: iniciar implementación conforme a `api/openapi/assembly.yaml` tras estabilizar contexto Tenant.

### Hoja de ruta trimestral
- **T1**: seguridad y CI.
- **T2**: broker NATS y eventos.
- **T3**: gateway y permisos finos.

### ADRs y documentación pendientes
- ADRs planificados sobre mensajería avanzada, multitenancy extendido y autorización fina (seguimiento en `docs/tareas.md` → Documentación / ADRs).
- Glosario ampliado, runbooks operativos y ejemplos OpenAPI versionados continúan en backlog de documentación (`docs/tareas.md`).

### Seguimiento complementario
- Backlog granular y checklist de implementación: `docs/tareas.md`.
- Estado ejecutivo y riesgos: `docs/status.md`.
- Hallazgos de auditoría para próximas PR: `docs/audits/2025-09-16-structure.md`.

---

## Apéndice — Guía de estructura y premisas del monorepo

Estructura monorepo y premisas. Objetivo: entrega rápida, calidad constante, auditoría simple.

> Snapshot estratégico actualizado: ver `docs/status.md` (2025-09-15). Especificación técnica consolidada en `docs/spec.md`. Backlog granular en `docs/tareas.md`.

### 1) Estructura de carpetas (estado actual — 2025-09-22)

```
smartedify/
├─ .github/                  # Workflows y plantillas activas
├─ api/
├─ apps/
│  └─ services/
│     ├─ assembly-service/
│     ├─ auth-service/
│     ├─ tenant-service/
│     └─ user-service/
├─ docs/
├─ plans/
├─ scripts/
├─ ARCHITECTURE.md
├─ README.md
├─ docker-compose.yml
├─ package-lock.json
├─ task.md
└─ .env.example
```

El árbol anterior refleja únicamente los directorios presentes hoy en el repositorio. Cualquier carpeta no listada permanece en planificación o fue retirada tras auditorías previas.

### 1.b) Directorios objetivo y cronograma referencial

| Directorio objetivo | Propósito | Estado actual | ETA referencial |
|---|---|---|---|
| `apps/web-app/` | Portal web para usuarios finales (pnpm) | En backlog de producto | T3 2025 (posterior a gateway y permisos finos) |
| `apps/web-soporte/` | Consola de soporte/NOC | En backlog | T3 2025 |
| `apps/mobile-app/` | Cliente móvil (React Native/Flutter) | En discovery | T3 2025 |
| `packages/` (`core-domain`, `security`, `http-kit`, `event-bus`, `persistence`, `validation`, `i18n`, `ui-kit`) | Librerías compartidas para servicios y frontends | Diseño técnico en curso | T2 2025 (tras consolidar contract tests y eventos) |
| `db/` | Migraciones y *seeds* centralizados por dominio | Definición pendiente | T2 2025 |
| `infra/` (`terraform/`, `k8s/`, `docker/`, `gateway/`) | Infraestructura declarativa y artefactos de despliegue | En preparación | T2 2025 |
| `ops/` (`runbooks/`, `sre/`, `playbooks/`) | Operaciones, SLO y respuesta a incidentes | Planificado | T2 2025 |
| `tools/` | CLI internas y automatizaciones | En evaluación | T2 2025 |
| `docs/prd`, `docs/api`, `docs/legal` | Documentación generada y plantillas regulatorias | Backlog de documentación | T2 2025 |

El seguimiento detallado de estas entregas vive en `docs/status.md` y `docs/tareas.md`; las fechas podrán ajustarse según dependencias técnicas y capacidad del equipo.

### 2) Plantilla de servicio (apps/services/*-service)

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

### 3) Frontends

Los directorios front-end aún no existen en el monorepo; permanecerán en backlog hasta completar la capa de gateway y los contratos compartidos.

```
apps/web-app/                # Estructura objetivo (no creada)
├─ src/
├─ public/
├─ vite.config.ts
└─ package.json

apps/web-soporte/            # Estructura objetivo (no creada)
apps/mobile-app/             # Estructura objetivo (no creada)
```

### 4) Premisas de creación de archivos

#### Naming y layout

* Kebab-case para carpetas (`assembly-service`), PascalCase para tipos, snake_case en SQL.
* `cmd/server/main.*` como entrypoint único.
* Un handler por archivo. Máx 300 líneas por archivo objetivo.
* DTOs en `adapters/http/dto/*`. No exponer entidades de dominio.

#### Contratos primero

* PRs que cambian API deben actualizar `api/openapi/*.yaml` y ejemplos.
* Generar SDKs cliente desde OpenAPI/proto en CI y publicar en `packages/*-sdk`.

#### Configuración

* Variables env con prefijo por servicio: `ASM_`, `AUTH_`, etc. Separar host vs contenedor (`HOST_DB_HOST`, `HOST_DB_PORT` vs `DB_HOST`, `DB_PORT`).
* Plantilla `.env.example` obligatoria con placeholders (`CHANGE_ME_*`), sin credenciales reales.
* Centralizar defaults en `internal/config/` (futuro) con tipado y validación (Zod / env-safe).
* Nuevos endpoints operativos en auth-service: `/health` y `/metrics`.

#### Seguridad

* Sin secretos en repo. Usar secretos de CI y vault.
* TLS obligatorio. JWT verificado en gateway y servicio.
* Logs sin PII. Redactar tokens y documentos.

#### Persistencia

* Migraciones del auth-service se movieron a carpeta limpia `migrations_clean/` para resolver corrupción histórica.
* Convención: solo archivos autogenerados (timestamp + slug). No mezclar nombres manuales (`001_`, etc.).
* Índices/constraints declarados junto al schema base (users, user_roles, audit_security).
* Próximo (T2): patrón outbox y migraciones de performance (índices adicionales, particiones si aplica).
* Cada caso de uso encapsulado en transacciones atómicas (pendiente refactor capa app).

#### Testing

* Cobertura mínima 80% en `internal/app` y `domain`.
* Tests de contrato para HTTP/gRPC con snapshots.
* Pruebas de migraciones en CI.

#### Observabilidad

* Logging estructurado (pino + pino-http) con correlación `x-request-id`.
* Health check: `/health` valida DB y Redis (status ok/degraded).
* Métricas expuestas en `/metrics` (Prometheus):
  - `auth_http_requests_total{method,route,status}`
  - `auth_http_request_duration_seconds` (histogram)
  - Métricas por defecto Node (GC, heap, event loop)
* Métricas de negocio (implementadas en auth-service: login_success_total, login_fail_total, password_reset_requested_total, password_reset_completed_total, refresh_rotated_total, refresh_reuse_blocked_total) – exportadas junto a métricas técnicas.
