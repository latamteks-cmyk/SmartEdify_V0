# Catálogo de Diagramas

Este directorio centraliza los diagramas Mermaid de arquitectura, seguridad, observabilidad y flujos críticos de SmartEdify. Todos los archivos `.mmd` deben cumplir la convención descrita a continuación para mantener trazabilidad y automatizar validaciones.

## Convención de front matter
Cada diagrama inicia con un bloque front matter en YAML (delimitado por `---`) que describe metadatos obligatorios.

```yaml
---
id: example-diagram
title: "SmartEdify – Example Diagram"
description: "Resumen breve del objetivo del diagrama."
updated: 2025-02-14
tags: ["dominio", "tipo"]
---
```

### Reglas por campo
| Campo | Formato | Reglas |
| --- | --- | --- |
| `id` | `kebab-case` | Debe coincidir con el nombre del archivo (sin extensión) y ser único. |
| `title` | Texto | Usar inglés y un prefijo opcional `SmartEdify –`. |
| `description` | Texto | Describir el objetivo del diagrama en una frase. |
| `updated` | `YYYY-MM-DD` | Fecha de última actualización relevante. |
| `tags` | Lista | Mínimo un tag; usar palabras clave en minúsculas (ej. `architecture`, `flowchart`). |

### Esquema de validación
El bloque se valida con el siguiente esquema JSON (simplificado) y es el que verifica `scripts/lint-mermaid.mjs`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "title", "description", "updated", "tags"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9\\-]+$" },
    "title": { "type": "string", "minLength": 1 },
    "description": { "type": "string", "minLength": 1 },
    "updated": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
    "tags": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "minLength": 1 }
    }
  }
}
```

## Estilo de diagramas
- Evitar fences ```mermaid```; los archivos `.mmd` deben contener únicamente la sintaxis Mermaid.
- Para notas o etiquetas multilínea usar `<br/>` (Mermaid interpreta saltos HTML) en lugar de `\n`.
- Mantener comentarios escuetos (`%%`) sólo cuando agreguen contexto útil.
- Nombres de archivo en `kebab-case`; contenido en inglés salvo anotaciones puntuales.

## Catálogo actual
| id | Archivo | Título | Tags |
| --- | --- | --- | --- |
| `architecture-overview` | `architecture-overview.mmd` | SmartEdify – Architecture Overview | architecture, flowchart |
| `auth-metrics-flow` | `auth-metrics-flow.mmd` | SmartEdify – Auth Metrics Flow | auth, metrics, flowchart |
| `auth-sequence` | `auth-sequence.mmd` | SmartEdify – Auth Service Login Sequence | auth, sequence |
| `auth-token-lifecycle` | `auth-token-lifecycle.mmd` | SmartEdify – Auth Token Lifecycle | auth, tokens, state |
| `consumer-processing-flowchart` | `consumer-processing-flowchart.mmd` | SmartEdify – Consumer Processing Flowchart | eventing, kafka, flowchart |
| `consumer-retry-sequence` | `consumer-retry-sequence.mmd` | SmartEdify – Consumer Retry Sequence | eventing, reliability, sequence |
| `jwks-rotation-sequence` | `jwks-rotation-sequence.mmd` | SmartEdify – JWKS Rotation Sequence | security, jwks, sequence |
| `jwks-rotation-state` | `jwks-rotation-state.mmd` | SmartEdify – JWKS Key State Lifecycle | security, jwks, state |
| `network-ports` | `network-ports.mmd` | SmartEdify – Network Ports Mapping | infrastructure, network, flowchart |
| `observability-roadmap` | `observability-roadmap.mmd` | SmartEdify – Observability Roadmap | observability, roadmap, gantt |
| `outbox-flow` | `outbox-flow.mmd` | SmartEdify – Outbox Flow | eventing, outbox, flowchart |
| `security-priorities` | `security-priorities.mmd` | SmartEdify – Security Priorities Roadmap | security, roadmap, flowchart |
| `tenant-context-sequence` | `tenant-context-sequence.mmd` | SmartEdify – Tenant Context Resolution Sequence | tenant, context, sequence |
| `testing-architecture` | `testing-architecture.mmd` | SmartEdify – Multi-Project Testing Architecture | testing, architecture, flowchart |
| `tracing-span-map` | `tracing-span-map.mmd` | SmartEdify – Tracing Span Map (Auth & Tenant) | observability, tracing, flowchart |

## Flujo para añadir o modificar diagramas
1. Crear/editar el archivo `.mmd` con el front matter actualizado.
2. Seguir las reglas de estilo anteriores y documentar notas contextuales con `<br/>` cuando sean multilínea.
3. Ejecutar `npm run lint:mermaid` (o `node scripts/lint-mermaid.mjs`) para validar metadatos y verificar que no existan fences.
4. Adjuntar el diagrama al README raíz o a los documentos relevantes si aplica.

## Próximos Diagramas (Backlog)
- `schema-validation-flow.mmd`: Validación de eventos (publisher + consumer) con registry.
- `supply-chain-security.mmd`: SBOM, firma y políticas de admisión.
- `contract-testing-flow.mmd`: Pipeline lint (Spectral) + snapshots + generación SDK.
- `tracing-span-map.mmd`: Mapa de spans y atributos cross-service.

## Actualización cruzada
Si se modifica un diagrama referenciado en `README.md` raíz o `status.md`, validar que la información siga alineada y actualizar ambos documentos cuando corresponda.
