
---
title: "ADR-0006: Trazas Distribuidas con OpenTelemetry"
date: 2025-09-14
status: Aceptado
authors: [Equipo de arquitectura]

# ADR-0006: Trazas Distribuidas con OpenTelemetry

## Tabla de Contenido
1. [Contexto](#contexto)
2. [Decisión](#decisión)
3. [Alcance Inicial y Fases Futuras](#alcance-inicial-y-fases-futuras)
4. [Alternativas Consideradas](#alternativas-consideradas)
5. [Consecuencias y Métricas de Éxito](#consecuencias-y-métricas-de-éxito)
6. [Backlog Relacionado](#backlog-relacionado)
7. [Implementación](#implementación)
8. [Referencias](#referencias)

---

## 1. Contexto
La plataforma evoluciona hacia un ecosistema de micro-servicios/event-driven (outbox + Kafka). Se requiere:
- Correlación extremo a extremo (HTTP entrante → lógica de dominio → publicación outbox → broker → consumer).
- Reducción de MTTR en incidencias de latencia y errores intermitentes.
- Base común para futuros SLOs de latencia percibida y detección de cuellos de botella (DB vs broker vs handler).

Ya existe instrumentación de métricas Prometheus y logs estructurados; falta la tercera pata del triángulo observability (tracing) para:
- Identificar cascadas de reintentos.
- Ver propagación de contexto multi-tenant y correlationId.
- Alinear con adopción futura de schema validation en publisher/consumer.

## 2. Decisión
Adoptar OpenTelemetry (OTel) usando:
- `@opentelemetry/sdk-node` + auto-instrumentations (HTTP, pg, express/fastify, redis cuando aplique, kafkajs cuando plugin estable o manual spans).
- Exportador OTLP HTTP (`@opentelemetry/exporter-trace-otlp-http`).
- Convenciones de recursos: `service.name`, `deployment.environment`.
- Spans manuales en puntos críticos no cubiertos por auto-instrumentación: `kafka.publish`, `outbox.poll.batch`, `outbox.publish.record`, (futuro) `consumer.handle`.
- Propagación W3C Trace Context (default) y soporte potencial para B3 si se requiere interoperabilidad externa.

## 3. Alcance Inicial y Fases Futuras
### Alcance Inicial (Fase 1)
1. Auth Service y Tenant Service con bootstrap de tracing.
2. Instrumentación automática de HTTP + pg.
3. Spans manuales en publisher Kafka.
4. Variables de entorno para endpoint: `OTEL_EXPORTER_OTLP_ENDPOINT`.
5. Idempotencia en inicialización para evitar múltiples providers en tests.

### Fases Futuras
| Fase | Elemento | Objetivo |
|------|----------|----------|
| 2 | Consumer handlers | Span por evento + atributos (event.type, tenant.id, retry.count) |
| 2 | Outbox poller | Span por lote + métrica correlada (batch size, lag) |
| 3 | Enriquecer semántica | Uso de `messaging.*` y `db.*` estandarizado |
| 3 | Sampling dinámico | Ajustar tasa según error rate o endpoints calientes |
| 4 | Trace joins externos | Propagar trace context a llamadas a servicios externos posteriores |

## 4. Alternativas Consideradas
- Solo logs + métricas: Insuficiente para cascadas y latencias compuestas.
- APM propietario (Datadog/New Relic): Coste + lock-in + menor flexibilidad inicial.
- OpenTracing legado: Deprecado a favor de OTel merge.

## 5. Consecuencias y Métricas de Éxito
**Positivas:**
- Visibilidad detallada de latencia por capa.
- Base para SLOs reales por endpoint / tipo de evento.
- Facilita depurar fallas de publicación (span de publish con error).

**Negativas / Costes:**
- Overhead mínimo de CPU/memoria (<5-10% en casos típicos si sampling=always para dev).
- Config adicional en despliegue (collector u otro backend).
- Necesidad de hygiene (evitar spans superfluas en loops intensivos).

**Métricas de Éxito:**
- Tiempos p95 de endpoints clave visibles en backend de trazas.
- Trazas completas conteniendo publish span en >90% de requests que generan eventos.
- Reducción de tiempo promedio de diagnóstico en incidentes (meta: -30% tras 2 sprints).

## 6. Backlog Relacionado
- ADR futuro para rotación JWKS incluirá emisión de trace en verificación clave.
- Integrar sampling adaptativo.
- Añadir correlación trace-id ↔ registro outbox para queries forenses.

## 7. Implementación
El merge inicial contiene:
- Archivo `internal/observability/tracing.ts` (Auth + patrón similar en Tenant ya existente).
- Hook de inicialización previo al server y apagado gracioso.
- Span manual en `KafkaPublisher.publish`.

## 8. Referencias
- [OTel Spec](https://opentelemetry.io/docs)
- [Semantic Conventions (messaging)](https://opentelemetry.io/docs/specs/semconv/messaging)
- [ARCHITECTURE.md](../../../ARCHITECTURE.md)
