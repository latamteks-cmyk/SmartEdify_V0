# Guía de Arquitectura — Buenas prácticas y correcciones

## Principios
- Un servicio = una responsabilidad.
- Contratos primero: OpenAPI por HTTP, esquemas por eventos.
- Compatibilidad hacia atrás por una versión menor.
- Seguridad por defecto, *least privilege*.
- Observabilidad integral: trazas, métricas y logs correlacionados.

## Correcciones clave (respecto a hallazgos del CTO)
1. **Rotación JWKS operativa**: endpoint `/.well-known/jwks.json`, 3 estados de clave, revocación forzada de *refresh tokens*.
2. **Mensajería**: NATS como broker PMV. Temas con *subject* versionado y DLQ por servicio.
3. **CI con gates**: lint, typecheck, unit + integration, cobertura mínima 80% críticos, lint OpenAPI, SBOM, SAST, escaneo contenedores.
4. **Hardening**: contenedores no root, FS read-only, healthchecks, límites de recursos, CORS estricto.
5. **Documentación viva**: `docs/documento-rector.md` y `docs/architecture/overview.md` se actualizan por PR.

## Diseño de servicios
- **gateway-service**: BFF para Squarespace, CORS y OIDC PKCE.
- **auth-service**: emisión JWT, JWKS, MFA opcional, auditoría de sesiones.
- **tenant-service**: padrón y roles. 
- **assembly-service**: convocatorias, acreditación, votos, actas.
- **reservation-service**: áreas, reservas, pagos.
- **maintenance-service**: activos, incidencias, OTs.
- **documents-service (lite)**: S3 + metadatos.
- **communications-service (lite)**: e-mail y push.
- **finance-service (lite)** y **payments-adapter**: asiento básico y conciliación.

## Versionado y compatibilidad
- HTTP: prefijo `/v1`. Expandir modelos sin romper.
- Eventos: `subject=v1.<dominio>.<evento>`. Agregar campos sin eliminar.

## Errores y *idempotency*
- HTTP: `409` para duplicados con *idempotency-key*.
- Eventos: `event_id` y `source` para de-duplicación.

## Datos y migraciones
- Migraciones por servicio, *forward-only* con *rollback plan* documentado.
- Retención: outbox 7 días, DLQ 30 días, documentos WORM para actas.

## Observabilidad
- `trace_id` en logs. Export OTLP a Collector. Dashboards: latencia p95, error rate, *consumer lag*.

## Seguridad
- JWT con `aud`, `iss`, `sub`, `tenant_id`, `roles`, `scopes`.
- TLS extremo a extremo. HSTS en `api.smart-edify.com`.
- Secret management: GitHub Secrets + AWS Secrets Manager.
