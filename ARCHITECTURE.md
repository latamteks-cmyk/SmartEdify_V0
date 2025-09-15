# Arquitectura — SmartEdify_V0

## Resumen de la guía de arquitectura
- Principios rectores: un servicio por responsabilidad, contratos primero (OpenAPI y esquemas de eventos), compatibilidad hacia atrás por versión menor, seguridad *least privilege* y observabilidad integral (trazas, métricas y logs correlacionados).
- Correcciones clave acordadas con el CTO: rotación operativa de JWKS con tres estados y revocación de *refresh tokens*; mensajería en NATS con *subjects* versionados y DLQ por servicio; pipeline CI con *gates* (lint, typecheck, unit + integration, cobertura ≥80 % en críticos, lint OpenAPI, SBOM, SAST, escaneo de contenedores); hardening (contenedores no root, FS inmutable, límites de recursos, healthchecks y CORS estricto); documentación viva en `docs/README.md#documento-rector--smartedify_v0` y este archivo mediante PR.
- Diseño de servicios: gateway-service BFF para Squarespace con CORS y OIDC PKCE; auth-service (emisión JWT, JWKS, MFA opcional, auditoría de sesiones); tenant-service (padrón y roles); assembly-service (convocatorias, acreditación, votos, actas); reservation-service (áreas, reservas, pagos); maintenance-service (activos, incidencias, OTs); módulos *lite* para documentos (S3 + metadatos), comunicaciones (e-mail + push), finanzas y adaptador de pagos.
- Prácticas operativas: versionado `/v1` en HTTP y `subject=v1.<dominio>.<evento>` en eventos, idempotencia con `409` + `idempotency-key` y eventos con `event_id` y `source`, migraciones *forward-only* con plan de rollback y retenciones definidas (outbox 7 días, DLQ 30 días, documentos WORM).
- Observabilidad y seguridad: export OTLP con `trace_id` en logs, dashboards para latencia p95/tasa de error/*consumer lag*; JWT con `aud`, `iss`, `sub`, `tenant_id`, `roles`, `scopes`; TLS de extremo a extremo, HSTS y gestión de secretos en GitHub Secrets + AWS Secrets Manager.

Consulta la guía completa en [docs/architecture/guidelines.md](docs/architecture/guidelines.md).

## Visión
Plataforma SaaS con dominios: User Portal, Admin Portal, Mobile App. Servicios base: auth, user, tenant. Integración asincrónica con outbox y broker. Seguridad por defecto.

## Contexto (C4 nivel 1)
- Usuarios finales → User Portal y Mobile.
- Operadores → Admin Portal.
- Servicios internos → Auth, User, Tenant, Notificaciones (futuro).
- Infra → Postgres, Redis, Broker (Kafka/NATS), OTel Collector.

## Contenedores (C4 nivel 2)
- auth-service: emisión y verificación JWT, JWKS con rotación.
- user-service: perfil y preferencias. Cache selectivo en Redis.
- tenant-service: multitenancy, límites y *billing hooks*.
- api-gateway (futuro): rate-limit, WAF, agregación.

## Integración
- HTTP+JSON síncrono. Contratos en `api/openapi`.
- Eventos dominio: `user.created`, `tenant.provisioned`. Validación Zod. DLQ obligatoria.

## Seguridad
- Zero trust interno. mTLS entre servicios (futuro).
- JWT con `aud`, `iss`, `kid`. Rotación 3 estados.
- Secret management en GitHub Secrets y AWS Secrets Manager.

## Observabilidad
- Trazas OTel. Logs con `trace_id`. Métricas SLI: latencia p95, tasa error, *consumer lag*.

## Datos
- Migraciones por servicio. Esquemas versionados. Backfill seguro.

## DevOps
- CI monorepo. SBOM. Escaneo contenedores. Despliegue canario con rollback.

## Diagramas
Ver `docs/mermaid/*`.
