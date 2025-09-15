# Arquitectura — SmartEdify_V0

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
