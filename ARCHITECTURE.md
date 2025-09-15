# Arquitectura — SmartEdify_V0

## Resumen de la guía de arquitectura

- Principios rectores: un servicio por responsabilidad, contratos primero (OpenAPI y esquemas de eventos), compatibilidad hacia atrás, seguridad *least privilege* y observabilidad integral.
- Correcciones clave acordadas con el CTO: rotación operativa de JWKS, mensajería en NATS con *subjects* versionados y DLQ por servicio, pipeline CI con *gates* (lint, pruebas, cobertura ≥80 %, SBOM, SAST, escaneo de contenedores) y hardening (contenedores no root, FS inmutable, límites de recursos, CORS estricto).
- Diseño de servicios: gateway BFF, auth, tenant, assembly, reservation, maintenance y módulos lite para documentos, comunicaciones, finanzas y pagos.
- Prácticas operativas: versionado `/v1` en HTTP y `v1.<dominio>.<evento>` en eventos, idempotencia con `409` + `idempotency-key` y `event_id`, migraciones *forward-only* con planes de rollback y retenciones definidas (outbox 7 días, DLQ 30 días, documentos WORM).
- Observabilidad y seguridad: export OTLP con `trace_id` en logs, dashboards para latencia/error/*consumer lag*, JWT con *claims* obligatorias, TLS de extremo a extremo, HSTS y gestión de secretos en GitHub Secrets + AWS Secrets Manager.
- Documentación viva: `docs/README.md#documento-rector--smartedify_v0` y este archivo se actualizan mediante PR.

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
Ver `docs/design/diagrams/*`.
