# Índice de especificaciones del backend

El contenido previo de este archivo se reorganizó en documentos temáticos para facilitar su mantenimiento. Utiliza los enlaces siguientes para acceder a cada sección especializada:

- [Plano técnico del backend](architecture/backend-blueprint.md): estructura del monorepo, guardrails y estado de los servicios.
- [Estrategia de testing del Auth Service](testing/auth-service-strategy.md): proyectos Jest, políticas de *mocks* y métricas de calidad.
- [Roadmap de observabilidad](observability/roadmap.md): principios de instrumentación, fases y KPI planificados.
- [Registro de decisiones técnicas recientes](architecture/decision-log.md): tabla consolidada de acuerdos y su impacto.

## Estado de la estructura del repositorio

- **Presente (2025-09-22)**: `.github/`, `api/`, `apps/services/{assembly,auth,tenant,user}-service`, `docs/`, `plans/`, `scripts/`, `ARCHITECTURE.md`, `README.md`, `docker-compose.yml`, `package-lock.json`, `task.md` y `.env.example`.
- **Planificado T2 2025**: `packages/` (subcarpetas `core-domain`, `security`, `http-kit`, `event-bus`, `persistence`, `validation`, `i18n`, `ui-kit`), `db/`, `infra/`, `ops/`, `tools/`, así como `docs/prd`, `docs/api` y `docs/legal` para documentación generada.
- **Planificado T3 2025**: `apps/web-app/`, `apps/web-soporte/` y `apps/mobile-app/` como frontends alineados al gateway y permisos finos.

> Referencia viva: la sección “Estructura de carpetas” de `docs/README.md` se actualiza con el estado y cronograma detallado. Ajustes futuros deberán mantener sincronizados ambos documentos.
