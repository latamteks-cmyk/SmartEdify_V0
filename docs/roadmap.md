# Roadmap Técnico Prioritario — Backend SmartEdify

> Migrado desde `docs/tareas.md`. Última actualización: 2025-09-17.
> Enfocado en pendientes P1/P2 que desbloquean seguridad, observabilidad y multitenancy.

## Auth Service (Prioridad Alta)
- [ ] Endurecer `/admin/rotate-keys`: autenticación administrativa, auditoría y job programado que promueva `retiring→expired`.
- [ ] Automatizar rotación periódica de claves (cron + alertas si falta `next`) y exponer estado en `/metrics`.
- [ ] Implementar outbox + publisher para eventos `user.registered`, `password.changed` y consumo inicial en User/Tenant.
- [ ] Completar OpenAPI + ejemplos y añadir contract tests (Spectral lint + Jest snapshots) en CI.
- [ ] Redactar tokens/PII en logs, instrumentar métricas de saturación (pool PG, Redis) y documentar alertas SLO.
- [ ] Integrar con gateway: cache JWKS, propagación `tenant_ctx_version` y políticas de autorización centralizadas.
- [ ] Diseñar roadmap MFA (WebAuthn/TOTP) tras estabilizar rotación automatizada y eventos.

## Tenant Service (Prioridad Alta)
- [ ] Implementar `/tenants/{id}/governance/delegate` con expiración automática, seguimiento `governance_delegation_active` y eventos `governance.delegated`.
- [ ] Mejorar validaciones de solapamiento en memberships (HTTP 409 detallado) y registrar schema `membership.added@2`.
- [ ] Añadir cache L1/L2 de `/tenant-context` con invalidación por evento y exponer métricas de hit/miss.
- [ ] Consolidar publisher Kafka (gestión de topics, retries) y habilitar consumer real con handlers y DLQ específica.
- [ ] Ejecutar Vitest + coverage en CI, incluyendo lint, contract tests OpenAPI y escaneo de seguridad.
- [ ] Modelar motor de políticas (`max_delegation_days`, `max_units`) + auditoría chain-hash extendida.

## User Service (Prioridad Alta)
- [ ] Migrar de almacenamiento en memoria a Postgres con migraciones (`users`, `profiles`, `preferences`, índices únicos`).
- [ ] Publicar OpenAPI + DTOs Zod; habilitar validaciones y errores consistentes.
- [ ] Conectar con eventos Auth/Tenant (`user.registered`, `membership.added`) y emitir `user.profile.updated`.
- [ ] Añadir métricas de usuarios activos y cobertura de pruebas (unit/integration) ≥70 %.

## Assembly Service (Prioridad Alta)
- [ ] Finalizar PRD y ADRs de dominio (flujos, quórum, estados) antes de escribir código.
- [ ] Definir contratos iniciales (`/assemblies`, `/flows`, `/processes`) y esquema de persistencia.
- [ ] Preparar plan de integración con Tenant/Auth (consumo `tenant-context`, claims) y estrategia de pruebas.

## Capacidades Transversales
- [ ] Definir alertas SRE y runbooks en `ops/` para métricas críticas (login, refresh reuse, outbox, DLQ, lag consumidor).
- [ ] Automatizar contract testing para todos los OpenAPI/Proto (Spectral + pruebas generadas) previo al merge.
- [ ] Extender pipelines con SBOM (Syft), escaneo Trivy y firma cosign; documentar políticas Kyverno recomendadas.
- [ ] Normalizar lint/format y pre-commit en los cuatro servicios.
- [ ] Diseñar plan de creación de `packages/`, `infra/`, `ops/` y `tools/` (o ajustar documentación si se posterga).
- [ ] Publicar dashboards y alertas base (Grafana/Alertmanager) siguiendo el roadmap de observabilidad.

## Seguimiento
- Revisar y actualizar este roadmap al cierre de cada sprint.
- Hitos completados deben migrarse a `docs/status.md` y a los snapshots ejecutivos.
