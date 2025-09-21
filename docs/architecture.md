# Guía Consolidada de Arquitectura — SmartEdify

## 1. Visión y Alcance
SmartEdify es una plataforma SaaS modular para educación, compuesta por tres dominios principales (User Portal, Admin Portal, Mobile App) y una base de servicios desacoplados (Auth, User, Tenant, Assembly, Reservation, Maintenance). El objetivo es ofrecer una solución escalable, segura y observable, con integración asincrónica y contratos claros.

### Alcance
- **MVP**: Auth Service (registro, autenticación, recuperación de credenciales), Tenant Service Fase 0 (tenants, unidades, memberships, transferencia de administrador), User Service (perfil básico).
- **Interfaces**: Web y móvil en backlog, gestionadas en `docs/tareas.md`.
- **Integración**: HTTP+JSON y eventos de dominio (ver `api/openapi/` y `docs/eventing-guidelines.md`).

## 2. Principios Rectores y Buenas Prácticas
- Un servicio por responsabilidad (SRP).
- Contratos primero: OpenAPI y esquemas de eventos versionados.
- Compatibilidad hacia atrás y migraciones *forward-only*.
- Seguridad *least privilege* y zero trust.
- Observabilidad integral: tracing, métricas, logs con `trace_id`.
- Documentación viva y trazable (ver `docs/README.md#documento-rector--smartedify_v0`).
- Compatibilidad hacia atrás por una versión menor.
- Seguridad por defecto, *least privilege*.
- Documentación viva: `docs/README.md#documento-rector--smartedify_v0` y `ARCHITECTURE.md` se actualizan por PR.

## 3. Diseño de Servicios y Dominios
- **Auth Service**: JWT, JWKS con rotación, refresh tokens, métricas Prometheus, MFA opcional, auditoría de sesiones.
- **Tenant Service**: multitenancy, límites, unidades, memberships, roles y gobierno.
- **User Service**: perfil, preferencias, cache selectivo en Redis.
- **Assembly, Reservation, Maintenance**: ver planes y roadmap en `plans/`.
- **Gateway BFF**: rate-limit, WAF, agregación (ver `plans/gateway/gateway-service.md`).
- **Otros servicios**: documents-service (lite), communications-service (lite), finance-service (lite), payments-adapter.

## 4. Integración y Contratos
- HTTP+JSON síncrono (contratos en `api/openapi/`).
- Eventos de dominio: versionado `v1.<dominio>.<evento>`, validación Zod, DLQ obligatoria.
- Idempotencia: `409` + `idempotency-key` y `event_id`.
- HTTP: prefijo `/v1`. Expandir modelos sin romper.
- Eventos: `subject=v1.<dominio>.<evento>`. Agregar campos sin eliminar.

## 5. Seguridad
- JWT con `aud`, `iss`, `kid`, `sub`, `tenant_id`, `roles`, `scopes`. Rotación de claves en 3 estados (`current`, `next`, `retiring`) definida en ADR-0007 (Aceptado) y documentada en el README del Auth Service (ver `apps/services/auth-service/README.md#rotación-de-claves-jwt-jwks`).
- Publicación JWKS: endpoint `/.well-known/jwks.json` y rotación manual mediante endpoint de administración (`/admin/rotate-keys`) protegido por header/API key. Métricas expuestas: `auth_jwks_keys_total`, `auth_jwks_rotation_total`.
- mTLS entre servicios (futuro), TLS extremo a extremo, HSTS.
- Gestión de secretos: GitHub Secrets y AWS Secrets Manager.
- Hardening: contenedores no root, FS inmutable, límites de recursos, CORS estricto, healthchecks.
- Recuperación de contraseña documentada en `docs/auth/password-reset.md` (flujo, métricas y riesgos).

## 6. Observabilidad
- Trazas OTel, logs enriquecidos, métricas SLI (latencia p95, tasa error, *consumer lag*).
- Métricas específicas de Auth: ver README del servicio y documento de password reset (`docs/auth/password-reset.md`) para contadores de seguridad y recuperación.
- Dashboards y alertas (ver `docs/observability/`).
- `trace_id` en logs. Export OTLP a Collector. Dashboards: latencia p95, error rate, *consumer lag*.

## 7. Datos y Migraciones
- Migraciones por servicio, esquemas versionados, backfill seguro.
- Retenciones: outbox 7 días, DLQ 30 días, documentos WORM.
- Migraciones por servicio, *forward-only* con *rollback plan* documentado.

## 8. DevOps y Operación
- CI monorepo, SBOM, escaneo de contenedores, y gates de calidad activos: lint, typecheck, pruebas unitarias/contrato, validación de diagramas Mermaid y linting de OpenAPI con Spectral. Cobertura ≥80 % como objetivo (próximo gate). SAST y verificación Cosign (firmas y attestations) planificados como gates bloqueantes antes de liberar imágenes.
- Despliegue canario con rollback.
- Protocolos y guías en `docs/operations/ci-cd.md` y `docs/docker.md`.

## 9. Diagramas y Referencias
- Diagramas actualizados en `docs/design/diagrams/*` (ver `architecture-overview.mmd`, `network-ports.mmd`, `auth-sequence.mmd`, etc.).
- Decisiones clave y ADR en `docs/design/adr/`.
- Runbooks y guías operativas en `docs/runbooks/`.

## 10. Documentación y Trazabilidad
- Este documento es el rector técnico. El índice operativo y de referencia está en `docs/README.md`.
- Todas las actualizaciones deben reflejarse en ambos documentos y en los diagramas correspondientes.

---
> **Nota:** Para detalles de endpoints, catálogos activos y dependencias, consultar `docs/README.md` y los contratos OpenAPI.
