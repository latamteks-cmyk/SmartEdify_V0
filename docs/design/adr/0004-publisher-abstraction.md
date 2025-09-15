# ADR 0004: Publisher Abstraction & Enriched Event Envelope

## Status
Accepted (2025-09-14)

## Context
El Tenant Service emite eventos de dominio (p.ej. `governance.changed`) mediante un patrón Outbox (tabla `outbox_events`) que garantiza atomicidad y consistencia frente a la DB principal. Hasta ahora el "publisher" era implícito dentro del poller, sin separación de responsabilidades, lo que dificultaba:
- Sustituir la implementación de transporte (Kafka, NATS JetStream, RabbitMQ) sin tocar lógica de reintentos.
- Estandarizar la forma de serializar eventos y añadir metadata evolutiva.
- Instrumentar métricas de publicación específicas del broker.
- Introducir futuros concerns (firma, compresión, correlación) sin inflar el poller.

## Decision
1. Introducir interface `Publisher` con método único `publish(envelope): Promise<{ ok: boolean; error?: any }>`.
2. Extraer construcción del envelope enriquecido (campos base) en el poller antes de invocar publisher.
3. Añadir `LoggingPublisher` inicial (no-op broker) para permitir evolución incremental sin dependencia externa.
4. Enriquecer el envelope con campos:
   - `schemaVersion`: versión del contenedor (arranca en 1).
   - `eventVersion`: versión semántica individual del evento (arranca en 1; incrementa si cambia payload contract).
   - `occurredAt`: distingue el momento de negocio de la inserción (futuro: diferenciar si hay re-hydrate).
   - `tenantId`, `partitionKey`, `correlationId`, `traceId`, `headers` (metadata flexible).
5. Exponer métricas broker neutrales: `broker_publish_total`, `broker_publish_failed_total`.
6. Mantener retries y backoff exclusivamente en el poller (capa outbox), asumiendo publisher no reintenta internamente.

## Envelope v1 (JSON Schema informal)
```json
{
  "id": "uuid",
  "aggregateType": "string",
  "aggregateId": "uuid",
  "type": "string",
  "payload": {},
  "createdAt": "RFC3339",
  "occurredAt": "RFC3339",
  "schemaVersion": 1,
  "eventVersion": 1,
  "tenantId": "uuid?",
  "correlationId": "string?",
  "partitionKey": "string?",
  "headers": {"k": "v"}?,
  "traceId": "string?"
}
```

## Alternatives Considered
| Alternativa | Motivo Rechazo |
|-------------|----------------|
| Inyectar cliente Kafka directamente en poller | Mezcla responsabilidades y dificulta test aislado. |
| Retries dentro del publisher | Duplica lógica de control ya resuelta por outbox (single source of truth). |
| No enriquecer envelope todavía | Aplaza decisiones y obliga migración disruptiva futura. |
| Usar CloudEvents completo | Overhead inicial innecesario; se puede mapear a futuro si se requiere interoperabilidad. |

## Consequences
Positivas:
- Testeabilidad: publisher stub simplifica pruebas.
- Evolución: añadir `KafkaPublisher` solo requiere implementar interface.
- Observabilidad: métricas separadas broker vs. outbox.
- Extensibilidad futura (firma, compresión, headers específicos) sin tocar poller central.

Negativas / Costes:
- Ligero overhead de construcción de envelope.
- Necesidad de mantener sincronía entre `eventVersion` y migraciones de payload (política por definir).

## Rollout Plan
1. (Hecho) Introducir interface + LoggingPublisher.
2. Añadir validación schema (opcional) antes de publicar (fase siguiente si se detecta necesidad).
3. Implementar adapter real (Kafka/NATS) y feature flag para activar.
4. Añadir consumer separado + métrica `broker_lag_seconds`.
5. Documentar convención de versionado de eventos (tabla contract → versión).

## Open Questions
- ¿Se necesita cadena de firmas (hash chain) al nivel envelope o solo para governance? (Pendiente ADR específica).
- ¿PartitionKey = always aggregateId? (Para multi-aggregate events quizá otra lógica). 
- ¿Incluir `source` y `specVersion` para compatibilidad CloudEvents? (Reevaluar en Fase 2+).

## References
- Outbox Pattern (Fowler / Debezium docs)
- CloudEvents v1.0 (para mapeo futuro)
- ADR 0003 Outbox Event Propagation (base de diseño previo)
