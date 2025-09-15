<a id="documento-rector--smartedify_v0"></a>
# Documento Rector — SmartEdify_V0

## 1. Visión global
Objetivo: plataforma SaaS modular para educación. Tres dominios: User Portal, Admin Portal, Mobile App. **TODO** confirmar alcance MVP por dominio.

## 1.1 Guías consolidadas
Recursos clave para profundizar desde el inicio del proyecto:
- [Lineamientos de arquitectura](architecture/guidelines.md): principios, patrones y convenciones obligatorias a nivel de diseño.
- [Pautas de CI/CD y operaciones](operations/ci-cd.md): expectativas de pipelines, gates de calidad y protocolos de despliegue.

## 2. Áreas críticas detectadas
- JWKS rotation incompleta.
- Broker y DLQ pendientes.
- CI sin gates de cobertura y seguridad en `main`.
- Placeholders sensibles en `.env` y compose.

## 3. Dominios
### 3.1 User Portal
Funciones: registro, login, perfil, recuperación de contraseña. **TODO** flujos y vistas.

### 3.2 Admin Portal
Funciones: gestión de tenants, usuarios, roles, límites. **TODO** permisos y auditoría.

### 3.3 Mobile App
Funciones: autenticación, perfil, notificaciones. **TODO** alcance inicial.

## 4. Arquitectura global
Resumen en `ARCHITECTURE.md`. Diagramas en `docs/design/diagrams/*`.
Ver `docs/design/diagrams/network-ports.mmd` para puertos y relaciones, y `plans/gateway/gateway-service.md` para el BFF.
Lineamientos completos: ver [Guía de arquitectura unificada](architecture/guidelines.md).

## 5. Catálogo de funciones y endpoints
| Dominio | Función | Servicio | Endpoint | Método | Auth |
|---|---|---|---|---|---|
| User | Login | auth | `/auth/login` | POST | público |
| User | JWKS | auth | `/.well-known/jwks.json` | GET | público |
| User | Perfil | user | `/users/me` | GET | bearer |
| Admin | Tenants | tenant | `/tenants` | POST | admin |
| Admin | Usuarios | user | `/admin/users` | GET | admin |
**TODO** completar desde OpenAPI.

## 6. Plan por microservicio
- auth-service: implementar rotación JWKS y revocación. Métricas por `kid`. Pruebas de compatibilidad.
- user-service: contratos OpenAPI, caché selectiva, tests de integración.
- tenant-service: eventos `tenant.provisioned`, límites por plan, DLQ.

## 7. Roadmap
- T1: seguridad y CI. T2: broker NATS y eventos. T3: gateway y permisos finos.

## 8. Buenas prácticas
Un servicio = una responsabilidad. Seguridad por defecto. Observabilidad integral. CI/CD con rollback. Límites de costo definidos.
Protocolos detallados en [Política operativa y de CI/CD](operations/ci-cd.md).

## 9. ADRs globales
- ADR-0007 JWKS rotation. **TODO** ADR mensajería, multitenancy, autorización.

## 10. Apéndices
- Glosario, referencias y *runbooks*. **TODO**
- Auditorías periódicas: ver `docs/audits/2025-09-16-structure.md`.

---

# Guía de estructura y premisas del monorepo

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

# 2) Plantilla de servicio (apps/services/*-service)

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

* Kebab-case para carpetas (`assembly-service`), PascalCase para tipos, snake_case en SQL.
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
