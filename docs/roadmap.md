# Roadmap Técnico Prioritario — Backend SmartEdify

> Migrado desde `docs/tareas.md` (eliminado). Última actualización: 2025-09-16.
> Se listan únicamente los pendientes P1/P2 con mayor impacto en seguridad, observabilidad y habilitadores de producto.

## Auth Service (Prioridad Alta)
- [ ] Implementar JWT con verificación centralizada en gateway y servicio (alinear con rotación JWKS y políticas de autorización).
- [ ] Configurar TLS obligatorio y asegurar que los secretos permanezcan fuera del repositorio.
- [ ] Redactar tokens y datos sensibles en logs JSON para garantizar ausencia de PII.
- [ ] Implementar patrón outbox para eventos externos (`user.registered`, `password.changed`).
- [ ] Añadir pruebas de contrato HTTP/gRPC con snapshots sanitizados y validación Spectral en CI.
- [ ] Configurar tracing OTel con atributos `tenant_id`, `service`, `user_id` para todos los endpoints críticos.
- [ ] Instrumentar métricas de negocio (`auth_login_success_total`, `auth_login_fail_total`, `auth_password_reset_total`, `auth_refresh_reuse_detected_total`) y alertas SLO asociadas.
- [ ] Extender CI/CD para publicar imagen, ejecutar `helm lint` y preparar firma con cosign.

## Tenant Service (Prioridad Alta)
- [ ] Completar endpoint de alta de memberships (`/units/{id}/memberships`) con validación de solapamiento y respuestas 409 documentadas.
- [ ] Emitir evento `membership.added` y mantener `membership_active` actualizado (gauge) tras cada operación.
- [ ] Implementar delegaciones temporales (`/tenants/{id}/governance/delegate`) con expiración automática (worker/cron) y métrica `governance_delegation_active`.
- [ ] Integrar con Auth para incluir `tenant_ctx_version` en refresh tokens y exponer cache L1 con invalidación por evento de contexto.
- [ ] Documentar y orquestar motor de políticas (`max_delegation_days`, `max_units`) junto a auditoría extendida (chain hash job).

## User Service (Prioridad Alta)
- [ ] Documentar contratos en `api/openapi.yaml` y ejemplos antes de continuar implementación.
- [ ] Implementar validaciones con Zod/JSON-Schema y DTOs en `adapters/http/dto/` evitando exponer entidades de dominio.
- [ ] Crear migraciones versionadas (usuarios, perfiles, preferencias) con índices y constraints requeridos.
- [ ] Añadir pruebas unitarias (≥80% en `internal/app`/`domain`) e integración cubriendo CRUD y eventos `user.created`.

## Assembly Service (Prioridad Alta)
- [ ] Modelar flujos y procesos en `internal/domain` y documentarlos en PRD/ADR antes de codificar.
- [ ] Diseñar y documentar endpoints REST (`/assemblies`, `/flows`, `/processes`) con validaciones y DTOs.
- [ ] Definir estrategia de persistencia (migraciones + outbox) y pruebas de integración iniciales.

## Capacidades Transversales
- [ ] Definir alertas SRE en `ops/sre/alerts/` para métricas críticas (login, refresh, outbox, DLQ).
- [ ] Configurar lint y format en pre-commit y reforzar convenciones de commit/CODEOWNERS.
- [ ] Automatizar generación de SBOM (Syft) y escaneo (Trivy) en pipelines, habilitando firma de imágenes con cosign y políticas Kyverno (`runAsNonRoot`, `readOnlyRootFilesystem`).
- [ ] Mantener contratos OpenAPI/Proto actualizados y validar con Spectral/contract tests antes de cada merge.

## Seguimiento
- Actualizar este roadmap al cierre de cada sprint.
- Los hitos completados deben moverse a `docs/status.md` (sección "Decisiones" o "Próximos 14 días").
