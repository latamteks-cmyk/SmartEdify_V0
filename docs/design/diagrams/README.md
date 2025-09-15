# Catálogo de Diagramas

Este directorio contiene los diagramas de arquitectura y flujos claves de SmartEdify.

| Archivo | Título | Tipo | Propósito principal |
|---------|--------|------|---------------------|
| `event-pipeline.mmd` | Event Pipeline | Flowchart | Vista end-to-end del recorrido de un evento (outbox → broker → consumer → handler). |
| `architecture-overview.mmd` | Architecture Overview | Flowchart | Mapa macro de componentes, dominios de responsabilidad y límites. |
| `outbox-flow.mmd` | Outbox Flow | Flowchart | Detalle del pipeline de publicación desde la transacción hasta Kafka y métricas. |
| `consumer-retry-sequence.mmd` | Consumer Retry Sequence | Sequence | Dinámica de reintentos, clasificación de errores y uso de DLQ. |
| `tenant-context-sequence.mmd` | Tenant Context Resolution Sequence | Sequence | Resolución y cacheo de contexto de tenant + refresh de tokens. |
| `auth-token-lifecycle.mmd` | Auth Token Lifecycle | State Diagram | Estados y transiciones del ciclo de vida de access/refresh tokens. |

## Convenciones
- Diagramas Mermaid validados (intentar mantenerlos simples para lectura en PRs).
- Agregar `title:` en frontmatter cuando aplique.
- Mantener nombres de archivo en `kebab-case` y contenido en inglés excepto notas contextuales.

## Próximos Diagramas (Backlog)
- `jwks-rotation-sequence.mmd`: Rotación y propagación de claves.
- `schema-validation-flow.mmd`: Validación de eventos (publisher + consumer) con registry.
- `supply-chain-security.mmd`: SBOM, firma y políticas de admisión.

## Actualización
Si se modifica un diagrama que está referenciado en `README.md` raíz o `status.md`, verificar que las secciones siguen vigentes.
