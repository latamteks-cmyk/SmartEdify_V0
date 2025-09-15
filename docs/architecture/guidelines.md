# Guía de arquitectura

Este documento consolida los lineamientos generales de arquitectura, contratos HTTP, eventos y criterios de seguridad para SmartEdify.

## Principios generales
- Un servicio = una responsabilidad.
- Contratos primero: OpenAPI por HTTP, esquemas por eventos.
- Compatibilidad hacia atrás por una versión menor.
- Seguridad por defecto (*least privilege*).
- Observabilidad integral: trazas, métricas y logs correlacionados.

## Correcciones prioritarias
1. **Rotación JWKS operativa**: endpoint `/.well-known/jwks.json`, tres estados de clave y revocación forzada de *refresh tokens*.
2. **Mensajería**: NATS como broker PMV. Temas con *subject* versionado y DLQ por servicio.
3. **CI con gates**: lint, typecheck, unit + integration, cobertura mínima 80% en servicios críticos, lint OpenAPI, SBOM, SAST y escaneo de contenedores.
4. **Hardening**: contenedores `non-root`, sistemas de archivos `read-only`, *healthchecks* y límites de recursos. CORS estricto.
5. **Documentación viva**: `docs/documento-rector.md` y `ARCHITECTURE.md` se actualizan por PR.

## Servicios y límites de contexto
- **gateway-service**: BFF para Squarespace, CORS y OIDC PKCE.
- **auth-service**: emisión de JWT, JWKS y MFA opcional; auditoría de sesiones.
- **tenant-service**: padrón y roles.
- **assembly-service**: convocatorias, acreditación, votos y actas.
- **reservation-service**: áreas, reservas y pagos.
- **maintenance-service**: activos, incidencias y órdenes de trabajo.
- **documents-service (lite)**: almacenamiento en S3 y metadatos.
- **communications-service (lite)**: e-mail y push.
- **finance-service (lite)** y **payments-adapter**: asiento básico y conciliación.

## Contratos HTTP y OpenAPI
- Cada servicio mantiene un único documento OpenAPI con prefijo `/v1` para sus rutas.
- Los esquemas se definen en `components/schemas` y se reutilizan dentro del servicio.
- Cada operación expone un `operationId` único y se valida con contract tests.
- Spectral ejecuta linting obligatorio y se publica un preview Redoc en cada PR.

## Eventos y mensajería
- Broker estándar: NATS, con *subjects* versionados en el formato `v1.<dominio>.<evento>`.
- Los mensajes incluyen `data` con `id`, `occurred_at`, `actor`, `tenant_id` y el *payload* específico.
- Cada evento incorpora `event_id` UUID para garantizar idempotencia y *traceability*.
- Existe una cola de descartes `dlq.<service>` por servicio con *retry* exponencial y *jitter*, respaldada por su runbook.

## Versionado y compatibilidad
- HTTP: prefijo `/v1`; se permiten expansiones de modelos que no rompan contratos existentes.
- Eventos: se mantienen versiones compatibles añadiendo campos sin eliminar ni renombrar.

## Gestión de errores e idempotencia
- HTTP: `409` para duplicados con `idempotency-key`.
- Eventos: `event_id` y `source` permiten de-duplicación.

## Datos y migraciones
- Migraciones por servicio, *forward-only*, con plan de *rollback* documentado.
- Retención: outbox 7 días, DLQ 30 días; documentos WORM para actas.

## Observabilidad
- Incluir `trace_id` en logs y exportar OTLP hacia el Collector.
- Dashboards obligatorios: latencia p95, tasa de errores y *consumer lag*.

## Seguridad y hardening
- JWT con `aud`, `iss`, `sub`, `tenant_id`, `roles` y `scopes`.
- TLS de extremo a extremo y HSTS en `api.smart-edify.com`.
- Gestión de secretos: GitHub Secrets y AWS Secrets Manager.
- Contenedores ejecutan `USER` no root, con sistema de archivos `read_only` y `tmpfs` en `/tmp`.
- Aplicar perfiles restrictivos de *seccomp* y *AppArmor*.
- CORS limitado a `https://smart-edify.com` y `https://www.smart-edify.com`; mTLS interno entre gateway y microservicios (fase posterior).
- Rotación programada y de emergencia del JWKS; revocación de *refresh tokens* y `token introspection` para administradores.
- Dependabot, CodeQL, Trivy y Syft forman parte del pipeline; PRs con vulnerabilidades críticas se bloquean.
- Políticas de contraseñas: longitud mínima 16, rotación de 90 días cuando aplique y prohibición de guardar secretos en repositorios.
