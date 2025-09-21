# Documentación SmartEdify

> Última actualización: 21 de septiembre de 2025  
> **🎯 Estado**: OAuth 2.0 completamente funcional - Tests 100% pasando

Bienvenido a la documentación centralizada de SmartEdify. Este índice es el punto de entrada para desarrolladores, operadores, seguridad y stakeholders. Aquí encontrarás navegación por rol, referencias rápidas y guías de tareas comunes.

## 🔥 Hitos Recientes

### OAuth 2.0 Security Milestone ✅ **COMPLETADO**
- **100% tests OAuth pasando** tras corrección crítica de seguridad
- **CVE mitigado**: Vulnerabilidad de intercambio de tipos de token cerrada
- **Validación robusta**: Tipos de token validados, almacén en memoria para tests
- **Documentación completa**: [OAuth Revocation Fix](auth/oauth-revocation-fix.md)
- **Pull Request**: [#69](https://github.com/latamteks-cmyk/SmartEdify_V0/pull/69)

---

## Navegación por persona

### 👩‍💻 Desarrollador
- [Arquitectura y patrones](architecture.md)
- [Especificación API y contratos](spec.md)
- [Estrategia de testing](testing.md) ✅ **Auth Service 100% tests pasando**
- [Guía Docker y despliegue local](docker.md)
- [Operaciones CI/CD](operations/ci-cd.md)
- [Status y roadmap](status.md)
- **🔐 [OAuth Security Fix](auth/oauth-revocation-fix.md)** - Corrección crítica y análisis

### 🛡️ Seguridad
- [Política de seguridad](security/policy.md)
- [Hardening de seguridad](security/hardening.md)
- **🔐 [OAuth Security Fix](auth/oauth-revocation-fix.md)** - CVE mitigado y mejoras
- [Runbooks de incidentes](runbooks/)

### ⚙️ Operaciones
- [Runbooks operativos](runbooks/)
- [Observabilidad y métricas](observability/)
- [Operaciones diarias](operations/daily-operations.md)

### 📈 Stakeholder
- [Status y roadmap](status.md)
- [Plan técnico y decisiones](architecture/backend-blueprint.md)
- [Registro de decisiones técnicas](architecture/decision-log.md)

---

## Referencias rápidas
- [ADR y decisiones de diseño](design/adr/)
- [Diagramas y flujos](design/diagrams/)
- [Guía OpenAPI](openapi-guidelines.md)
- [Guía de eventos y contratos](eventing-guidelines.md)
- **🔐 [OAuth Security Fix](auth/oauth-revocation-fix.md)** - Corrección crítica de seguridad
- **📊 [Changelog 2025-09-21](changelog-2025-09-21.md)** - Estado actual del proyecto
- [Plan de optimización](../plan.md)
- [Tareas y tracking](../task.md)

---

## Guías de tareas comunes
- **Ejecutar tests OAuth**: `npm run test:auth:win` - ✅ 47/47 tests pasando
- **Desplegar localmente**: consulta [docker.md](docker.md)
- **Reportar vulnerabilidades**: consulta [security/policy.md](security/policy.md)
- **Consultar roadmap**: consulta [status.md](status.md)
- **Revisar correcciones OAuth**: consulta [auth/oauth-revocation-fix.md](auth/oauth-revocation-fix.md)

---

## Estructura de carpetas
```
docs/
├── README.md                 # Este índice
├── architecture.md           # Guía de arquitectura consolidada
├── spec.md                   # Especificación API y contratos
├── testing.md                # Estrategia de testing
├── docker.md                 # Guía Docker y despliegue
├── status.md                 # Status y roadmap
├── operations/
│   └── ci-cd.md             # CI/CD y despliegue
├── runbooks/                # Runbooks operativos
├── observability/           # Métricas y trazabilidad
├── security/
│   ├── policy.md            # Política de seguridad
│   └── hardening.md         # Hardening y mejores prácticas
└── design/                  # ADRs y diagramas
```

---
> Este README es el punto de entrada oficial. Todas las referencias internas deben actualizarse para apuntar aquí tras la consolidación.
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
