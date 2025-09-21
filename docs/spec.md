# Índice de especificaciones del backend

El contenido previo de este archivo se reorganizó en documentos temáticos para facilitar su mantenimiento. Utiliza los enlaces siguientes para acceder a cada sección especializada:


## Estado de la estructura del repositorio


> Referencia viva: la sección “Estructura de carpetas” de `docs/README.md` se actualiza con el estado y cronograma detallado. Ajustes futuros deberán mantener sincronizados ambos documentos.
# Especificación API Unificada y Contratos Técnicos

## Índice
- [Guía OpenAPI](#guía-openapi)
- [Convenciones de eventos y contratos](#convenciones-de-eventos-y-contratos)
- [Estrategia de pruebas de contrato](#estrategia-de-pruebas-de-contrato)
- [Referencias y herramientas](#referencias-y-herramientas)

---

## Guía OpenAPI

- Un archivo por servicio bajo `api/openapi/<servicio>/openapi.yaml`, rutas bajo `/v1`.
- Recursos en plural y minúscula (`/students`, `/students/{student_id}`), respuestas JSON en camelCase.
- `operationId` único por operación, reutilizado en pruebas de contrato y SDKs.
- Documentar todos los códigos de estado esperados y mensajes de error con `content.application/json`.
- Usar `components/parameters` para filtros comunes y `components/responses` para paginación, errores y `401/403`.
- Metadatos obligatorios: `info` (title, version, description, contact, license, termsOfService), `servers` (production y staging), `tags` y `externalDocs`.
- `components/schemas` compartidos dentro del servicio; no repetir definiciones entre endpoints.
- Enumeraciones reutilizables con `x-enum-varnames` y ejemplos con `x-examples`.
- Cambios compatibles: incrementar versión menor; incompatibles: versión mayor.

### Control de calidad
- Validar el spec con `npm run lint:openapi` (Spectral) en CI y antes de merge.
- Ejecutar contract tests que verifiquen `operationId` y respuestas con JSON Schema derivado de `components/schemas`.
- Generar documentación previa al merge con Redocly CLI (`npx @redocly/cli build-docs`).
- Revisar breaking changes usando `npx openapi-diff <base> <head>`.

### Herramientas recomendadas
- [Spectral](https://github.com/stoplightio/spectral) para linting y reglas personalizadas.
- [Redoc](https://github.com/Redocly/redoc) para visualización y previsualización de los specs.
- [OpenAPI Generator](https://openapi-generator.tech) para generar SDKs.

---

## Convenciones de eventos y contratos

- Subjects NATS: `v<version>.<dominio>.<agregado>.<accion>` (ej: `v1.billing.invoice.created`).
- Dominios/agregados en inglés singular, acciones en pasado.
- Identificadores (`actor_id`, `tenant_id`) en snake_case, UUID v4/v7.
- `event_id` como deduplication key.
- Versionado: cambios incompatibles incrementan versión del subject; compatibles, solo el schema.
- Estructura estándar: `data` con `id`, `occurred_at`, `actor`, `tenant_id`, `payload`.
- Schemas JSON versionados en `specs/events/<dominio>/<subject>.schema.json`.
- Validación con AJV (Node) o `jsonschema` (Python) en productores y consumidores.
- Contract tests ejecutan validación contra el mismo schema.
- CI ejecuta `npm run lint:events` para validar esquemas y diffs.

### Manejo de errores y DLQ
- En validación fallida: emitir `nack`, registrar `event_id` y motivo en observabilidad.
- Retentar con backoff exponencial y jitter hasta 5 veces, luego enrutar a `dlq.<servicio>`.
- Runbooks para reprocesar DLQ documentados en `docs/runbooks/`.

---

## Estrategia de pruebas de contrato

### OAuth 2.0 Security Testing ✅ **100% FUNCIONAL**
- **Estado**: Todos los tests OAuth pasando tras corrección crítica de seguridad
- **Cobertura**: Flujo completo autorización → emisión → revocación → introspección  
- **Seguridad**: CVE mitigado - validación robusta de tipos de token
- **Documentación**: [Corrección OAuth detallada](auth/oauth-revocation-fix.md)

### Contract Testing General
- Pruebas de contrato HTTP desde OpenAPI (`api/<servicio>.yaml`) usando Spectral + Schemathesis.
- Smoke test con Schemathesis disponible vía `npm run contract:<servicio>:schemathesis`.
- Resultados en `reports/contracts/<servicio>-schemathesis.xml` (JUnit) para CI.
- Uso de snapshots para normalizar tokens y headers variables.
- Validación de rutas críticas y cobertura de contratos.

### Testing Status por Servicio
- ✅ **Auth Service**: 47/47 tests (OAuth revocación, validación tokens, flujo completo)
- ✅ **Tenant Service**: Tests de integración estables
- ✅ **User Service**: Tests básicos implementados
- 📋 **Assembly Service**: Pendiente tras estabilizar contratos cross-service

---

## Referencias y herramientas
- [Plano técnico del backend](architecture/backend-blueprint.md)
- [Guía de eventos y contratos](eventing-guidelines.md)
- [Guía OpenAPI](openapi-guidelines.md)
- [Estrategia de testing del Auth Service](testing/auth-service-strategy.md)
- **🔐 [Corrección OAuth Security](auth/oauth-revocation-fix.md)** - Análisis completo de las mejoras de seguridad
- [Registro de decisiones técnicas](architecture/decision-log.md)
- [Runbooks y operación](runbooks/)
- [Diagramas y ADRs](design/)
- [Estado ejecutivo y riesgos](status.md)
- [Índice operativo y referencia](README.md)

---
> **Nota:** Tras la consolidación, los archivos individuales de especificación y guías serán eliminados o referenciados solo desde este documento.
