# Auditoría de estructura y contenido — 16/09/2025

## 1. Resumen ejecutivo
- El monorepo mantiene foco en backend (servicios Auth, Tenant, User, Assembly) pero varios componentes descritos en la especificación global (`packages/`, `infra/`, `ops/`, `tools/`) aún no existen.
- La documentación es abundante; sin embargo, hay divergencias entre la arquitectura deseada (docs/spec.md) y los artefactos presentes. Es clave alinear planes con entregables reales por PR.
- Auth-service y tenant-service concentran la implementación productiva. User y assembly continúan como scaffolds, lo que genera huecos frente a los diagramas y planes declarados.

## 2. Estructura de repositorio observada
```
/docs/
  architecture/
    overview.md
    diagrams/
/api/
/apps/
  services/
    auth-service/
    tenant-service/
    user-service/
    assembly-service/
/packages (no existe)
/infra (no existe)
/ops (no existe)
/scripts/
```
- El arbol real confirma la ausencia de `packages/`, `infra/`, `ops/`, `tools/` mencionados en `docs/spec.md`. Se sugiere registrar la diferencia o ajustar la especificación.
- `apps/services/` contiene servicios en diferentes fases de madurez. Solo Auth y Tenant poseen código funcional y pruebas.

## 3. Estado por servicio
### Auth-service (`apps/services/auth-service`)
- Código Express con validaciones Zod, Argon2 y emisión de JWT. Exposición de `/register`, `/login`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/health`, `/metrics`.
- Instrumentación actual: Prometheus (métricas técnicas) y logging estructurado. Tracing OTEL aún pendiente aunque descrito en README.
- Suite Jest multiproyecto configurada; pipelines CI ejecutan lint, build, tests y escaneo básico.

### Tenant-service (`apps/services/tenant-service`)
- Basado en Fastify con outbox y DLQ en Postgres. Rutas clave para tenants, unidades, memberships, gobernanza y `tenant-context`.
- Publisher/consumer implementados con métricas detalladas. Sin integración real con broker (Kafka) ni tests automáticos en pipeline.

### User-service (`apps/services/user-service`)
- API en memoria; OpenAPI y migraciones aún pendientes. Falta persistencia real y pruebas.

### Assembly-service (`apps/services/assembly-service`)
- Solo documentación y contratos iniciales; sin código operativo.

## 4. Documentación y contratos
- `docs/spec.md`, `docs/status.md` y `docs/documento-rector.md` establecen visión avanzada. Recomendación: marcar explícitamente qué partes son objetivos vs. entregables actuales para evitar confusión.
- OpenAPI disponibles: Auth (parcial) y Tenant (más completo). User y Assembly requieren generación y linting Spectral.
- Nuevos documentos (`docs/architecture/overview.md`, guías de eventos, seguridad, CI) describen arquitectura objetivo; mantener sincronización con implementación real.

## 5. Tooling, CI/CD y scripts
- `docker-compose.yml` solo despliega Postgres/Redis más contenedores opcionales. Variables `CHANGE_ME_*` persisten.
- `scripts/dev-up.ps1` automatiza arranque local y healthchecks, pero se centra en entorno Windows/PowerShell.
- Workflows CI existentes: Auth incluye lint/test/build/push; Tenant carece de ejecución de pruebas en pipeline.

## 6. Observabilidad y seguridad
- Auth expone `/metrics`; Tenant instrumenta métricas outbox/consumer. Tracing distribuido aún no habilitado.
- JWKS rotation diseñada en ADR-0007 y runbook, pero no implementada en código (solo planeada). Riesgo alto documentado.
- Hardening descrito en docs recientes (no root, read-only, mTLS futuro) todavía no reflejado en contenedores.

## 7. Riesgos y brechas
| Área | Brecha detectada | Recomendación |
|------|-----------------|---------------|
| Arquitectura | Documentos refieren servicios/paquetes inexistentes | Ajustar `docs/spec.md` o crear roadmap visible para `packages/`, `infra/`, `ops/`. |
| Seguridad | JWKS rotation pendiente de implementación | Priorizar feature en Auth; actualizar status tras merge. |
| Observabilidad | Falta tracing distribuido y métricas de negocio | Implementar spans mínimos y counters en Auth/Tenant. |
| Documentación | Mezcla de estado actual vs. visión futura | Etiquetar cada sección con `Estado` / `Roadmap` y enlazar a auditorías periódicas. |
| CI/CD | Pipeline Tenant sin tests ni escaneo | Extender workflow para ejecutar Vitest, coverage y análisis seguridad. |
| Servicios secundarios | User y Assembly sin persistencia real | Definir backlog incremental con hitos verificables por sprint. |

## 8. Próximos pasos sugeridos
1. Publicar plan de regularización para carpetas ausentes (`packages`, `infra`, `ops`) o actualizar spec para reflejar la realidad.
2. Implementar rotación JWKS en Auth con métricas y runbook ya documentados.
3. Añadir tracing OTel mínimo (login, refresh, tenant-context) y métricas de negocio básicas.
4. Completar pipeline CI de Tenant con tests y escaneo (Trivy/Syft).
5. Formalizar OpenAPI de User y Assembly; habilitar Spectral lint y contract tests.
6. Documentar en `docs/status.md` las acciones tomadas post auditoría para mantener traza histórica.
