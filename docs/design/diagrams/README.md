# Catálogo de Diagramas

Este directorio contiene los diagramas de arquitectura y flujos claves de SmartEdify.

| Archivo | Título | Tipo | Propósito principal |
|---------|--------|------|---------------------|
| `event-pipeline.mmd` | Event Pipeline | Flowchart | Vista end-to-end del recorrido de un evento (outbox → broker → consumer → handler). |
| `architecture-overview.mmd` | Architecture Overview | Flowchart | Mapa macro de componentes, dominios de responsabilidad y límites. |
| `network-ports.mmd` | Network Ports Mapping | Flowchart | Relación host↔contenedor de puertos expuestos por servicio. |
| `outbox-flow.mmd` | Outbox Flow | Flowchart | Detalle del pipeline de publicación desde la transacción hasta Kafka y métricas. |
| `consumer-retry-sequence.mmd` | Consumer Retry Sequence | Sequence | Dinámica de reintentos, clasificación de errores y uso de DLQ. |
| `tenant-context-sequence.mmd` | Tenant Context Resolution Sequence | Sequence | Resolución y cacheo de contexto de tenant + refresh de tokens. |
| `auth-token-lifecycle.mmd` | Auth Token Lifecycle | State Diagram | Estados y transiciones del ciclo de vida de access/refresh tokens. |
| `auth-sequence.mmd` | Auth Service Login Sequence | Sequence | Flujo de autenticación y emisión de tokens desde el gateway hasta auth-service. |
| `jwks-rotation-sequence.mmd` | JWKS Rotation Sequence | Sequence | Flujo de publicación /well-known y rotación dual current/next. |
| `jwks-rotation-state.mmd` | JWKS Key State Lifecycle | State Diagram | Estados: provisioning → current → retiring → deprecated → purge. |
| `testing-architecture.mmd` | Multi-Project Testing Architecture | Flowchart | Aislamiento Jest (security / unit / integration) y teardown de recursos. |
| `observability-roadmap.mmd` | Observability Roadmap | Gantt | Fases secuenciales de instrumentación y alertas. |
| `auth-metrics-flow.mmd` | Auth Metrics Flow | Flowchart | Generación e incremento de métricas de negocio Auth. |
| `security-priorities.mmd` | Security Priorities Roadmap | Flowchart | Cadena priorizada P1→P3 (JWKS, gateway, métricas, tracing, etc.). |

## Convenciones
- Diagramas Mermaid validados (intentar mantenerlos simples para lectura en PRs).
- Agregar `title:` en frontmatter cuando aplique.
- Mantener nombres de archivo en `kebab-case` y contenido en inglés excepto notas contextuales.

## Próximos Diagramas (Backlog)
- `schema-validation-flow.mmd`: Validación de eventos (publisher + consumer) con registry.
- `supply-chain-security.mmd`: SBOM, firma y políticas de admisión.
- `contract-testing-flow.mmd`: Pipeline lint (Spectral) + snapshots + generación SDK.
- `tracing-span-map.mmd`: Mapa de spans y atributos cross-service.

## Actualización
Si se modifica un diagrama que está referenciado en `README.md` raíz o `status.md`, verificar que las secciones siguen vigentes.
