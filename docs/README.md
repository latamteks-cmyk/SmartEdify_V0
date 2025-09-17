<a id="documento-rector--smartedify_v0"></a>
# Índice Operativo y de Referencia — SmartEdify_V0

Este documento sirve como índice vivo para la operación, referencia y seguimiento de la plataforma. El documento rector de arquitectura y alcance es `ARCHITECTURE.md`.

## 1. Panorama y dominios
- **Visión y alcance**: ver `../ARCHITECTURE.md` (visión, principios, dominios, alcances y dependencias).
- **Interfaces**: Web y móvil en backlog, gestionadas en `docs/tareas.md`.
- **Diagramas**: `docs/design/diagrams/*` (ver `architecture-overview.mmd`, `network-ports.mmd`, etc.).

## 2. Guías y lineamientos clave
- [Lineamientos de arquitectura](architecture/guidelines.md)
- [Guía de CI/CD y operaciones](operations/ci-cd.md)
- Pipeline CI/CD obliga verificación de firmas y attestations (Cosign) antes de publicar imágenes y documenta la promoción/rollback de Auth Service.
- [Guía de eventos y contratos](eventing-guidelines.md)
- [Guía de seguridad y hardening](security-hardening.md)
- Lint OpenAPI automatizado: `npm run lint:openapi` (Spectral con `.spectral.yaml`) y job `ci.yml` → `OpenAPI Lint`.

## 3. Estado y dependencias
- **Áreas críticas**: ver sección de riesgos y pendientes en `ARCHITECTURE.md` y `docs/tareas.md`.
- **Dominios activos**:
  | Dominio       | Estado actual | Dependencias actuales |
  |--------------|---------------|----------------------|
  | User Portal  | Sin interfaz desplegada; consumo de flujos vía servicios Auth/Tenant mientras se define UI en backlog. | Auth Service, Tenant Service |
  | Admin Portal | UI en definición; operaciones de gobierno disponibles vía Tenant Service (`/tenants`, `/governance`). | Auth Service, Tenant Service |
  | Mobile App   | No iniciada; alcance y navegación documentados en backlog móvil. | Auth Service, Tenant Service |

## 4. Catálogo de endpoints y contratos
- **Contratos OpenAPI**:
  - **Auth Service** (`v1.2.0`): `api/openapi/auth.yaml`. Incluye los flujos `/authorize`, `/token`, `/userinfo`, `/introspection`, `/revocation`, los alias `/oauth/*`, discovery `/.well-known/*`, métricas y rotación manual de JWKS. Se añadieron los campos opcionales de discovery (`service_documentation`, métodos de autenticación por endpoint) y ejemplos de error consistentes con la implementación actual.
  - **Tenant Service** (`v0.4.x`): contrato en consolidación (ver `docs/openapi-guidelines.md` y backlog en `docs/tareas.md`).
  - **Assembly Service** (`v1.1.0`): `api/openapi/assembly.yaml` con descripciones enriquecidas, respuestas de error estandarizadas y ejemplos para flujos de convocatoria, check-in y voto.
  - **User Service** (`v1.0.0`): `api/openapi/user.yaml` con contrato CRUD completo, ejemplos y respuestas estandarizadas.
- **Documentos de descubrimiento OIDC** (mantener sincronizados con despliegues):
  - `/.well-known/openid-configuration` y `/.well-known/jwks.json` contienen la instantánea canonical del proveedor.
  - `docs/oidc/openid-configuration.json` y `docs/oidc/jwks.json` replican los valores publicados para referencia offline.
- **Hallazgos de auditoría — Auth Service**:
  1. El contrato previo sólo cubría el MVP (`/register`, `/login`, `/refresh-token`) → se añadieron todos los endpoints públicos activos y alias `/oauth/*`.
  2. No se documentaban los códigos de error ni los payloads de respuesta → se normalizaron respuestas JSON, `operationId` y esquemas reutilizables.
  3. Los documentos `/.well-known/*` no estaban versionados → se añadieron snapshots en `docs/oidc/` para discovery y JWKS.
  4. No existía automatización formal de rotación JWKS → se agregó el job `npm run jwks:rotate` con verificación y métricas de edad.
- **Ejemplos de endpoints activos**:
  - **Auth Service**: `/register`, `/login`, `/refresh-token`, `/logout`, `/forgot-password`, `/reset-password`, `/roles`, `/permissions`, `/authorize`, `/oauth/authorize`, `/token`, `/oauth/token`, `/userinfo`, `/oauth/userinfo`, `/introspection`, `/oauth/introspection`, `/revocation`, `/oauth/revocation`, `/.well-known/openid-configuration`, `/.well-known/jwks.json`, `/health`, `/metrics`.
  - **Tenant Service**: `/tenants`, `/tenants/{id}`, `/tenants/{id}/units`, `/units/{id}/memberships`, `/tenant-context`, `/governance/transfer-admin`.
- Para detalles y seguridad, consulta los archivos OpenAPI y la documentación de cada servicio.

### Referencia rápida OIDC / ejemplos
- **Authorization Code + PKCE**:
  ```bash
  curl -G "https://auth.smartedify.com/authorize" \
    -H "Authorization: Bearer <ACCESS_TOKEN>" \
    --data-urlencode "response_type=code" \
    --data-urlencode "client_id=squarespace" \
    --data-urlencode "redirect_uri=https://www.smart-edify.com/auth/callback" \
    --data-urlencode "scope=openid profile email offline_access" \
    --data-urlencode "code_challenge=<CODE_CHALLENGE>" \
    --data-urlencode "code_challenge_method=S256"
  ```
- **Authorization Code + PKCE (alias `/oauth/authorize`)**:
  ```bash
  curl -G "https://auth.smartedify.com/oauth/authorize" \
    -H "Authorization: Bearer <ACCESS_TOKEN>" \
    --data-urlencode "response_type=code" \
    --data-urlencode "client_id=squarespace" \
    --data-urlencode "redirect_uri=https://www.smart-edify.com/auth/callback" \
    --data-urlencode "scope=openid profile email offline_access" \
    --data-urlencode "code_challenge=<CODE_CHALLENGE>" \
    --data-urlencode "code_challenge_method=S256"
  ```
- **Intercambio de tokens**:
  ```bash
  curl -X POST https://auth.smartedify.com/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code" \
    -d "code=<CODE>" \
    -d "redirect_uri=https://www.smart-edify.com/auth/callback" \
    -d "client_id=squarespace" \
    -d "code_verifier=<CODE_VERIFIER>"
  ```
- **Intercambio de tokens (alias `/oauth/token`)**:
  ```bash
  curl -X POST https://auth.smartedify.com/oauth/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=refresh_token" \
    -d "refresh_token=<REFRESH_TOKEN>" \
    -u "client-id:client-secret"
  ```
- **UserInfo con scope `profile email`**:
  ```bash
  curl https://auth.smartedify.com/userinfo \
    -H "Authorization: Bearer <ACCESS_TOKEN>"
  ```
- **Discovery**:
  ```bash
  curl https://auth.smartedify.com/.well-known/openid-configuration | jq
  ```
- **Rotación JWKS (job batch)**:
  ```bash
  npm run jwks:rotate
  ```
  El job publica nuevas llaves via `/admin/rotate-keys`, verifica el documento `/.well-known/jwks.json` y emite métricas `auth_jwks_key_age_hours{status="current"}` y `auth_jwks_key_age_hours{status="next"}` en stdout.

## 5. Referencias cruzadas y trazabilidad
- Documento rector: `../ARCHITECTURE.md`
- Decisiones clave y ADR: `design/adr/`
- Diagramas: `design/diagrams/`
- Runbooks y guías operativas: `runbooks/`
- Estado y entregables: `status.md`
- Tracker de alto nivel: `../task.md`.

---
> **Nota:** Toda actualización relevante debe reflejarse en este índice y en el documento rector de arquitectura. Mantener consistencia y trazabilidad entre contratos, código y documentación.

### Buenas prácticas vigentes
Un servicio = una responsabilidad. Seguridad por defecto. Observabilidad integral. CI/CD con rollback. Límites de costo definidos.
Protocolos detallados en [Política operativa y de CI/CD](operations/ci-cd.md).

### ADRs vigentes
- `ADR-0004` — Publisher & Envelope en outbox para eventos confiables.
- `ADR-0005` — Consumer processing con métricas y retries controlados.
- `ADR-0006` — Estrategia de tracing distribuido (en implementación progresiva).
- `ADR-0007` — Plan de rotación JWKS y gestión de claves (**Aceptado**).

### Referencias y apéndices
- Snapshot estratégico actualizado: `docs/status.md` (2025-09-23).
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

> Snapshot estratégico actualizado: ver `docs/status.md` (2025-09-23). Especificación técnica consolidada en `docs/spec.md`. Backlog granular en `docs/tareas.md`.

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
* Métricas de llaves JWKS: `auth_jwks_keys_total{status}` y `auth_jwks_rotation_total`; el job `npm run jwks:rotate` ejecuta la rotación via `/admin/rotate-keys`, valida el JWKS publicado y reporta la edad de cada clave (stdout y métricas Prometheus).

# SmartEdify — Documentación principal

## Consolidación y recomendaciones de mejora continua

### Estado actual
- Documentación técnica y operativa estandarizada y alineada a mejores prácticas CTO.
- ADRs, diagramas y runbooks validados, con referencias cruzadas y criterios de éxito claros.
- Guías operativas y de CI/CD accionables, con contactos y criterios de rollback.

### Sugerencias de mejora continua
- Revisar y actualizar ADRs y diagramas tras cada cambio arquitectónico relevante.
- Mantener los runbooks y guías operativas sincronizados con los flujos reales y alertas recientes.
- Incluir ejemplos de incidentes resueltos y lecciones aprendidas en una sección de post-mortems.
- Automatizar validaciones de sintaxis Mermaid y enlaces rotos en CI.
- Fomentar la retroalimentación de los equipos de dominio y SRE sobre claridad y utilidad de la documentación.
- Revisar referencias a dashboards y scripts de monitoreo tras cambios en infraestructura.

### Checklist de calidad documental
- [x] ADRs con contexto, decisión, consecuencias y referencias.
- [x] Diagramas .mmd validados y alineados a la arquitectura actual.
- [x] Runbooks con propósito, pasos, validación, rollback y contactos.
- [x] Guías de CI/CD con gates, rollback y validación post-despliegue.
- [x] Referencias cruzadas y enlaces a recursos clave.

> Para sugerencias o reportes de mejora documental, contactar a doc-admin@smartedify.com
