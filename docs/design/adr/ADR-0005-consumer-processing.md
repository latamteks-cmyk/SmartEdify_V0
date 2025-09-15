# ADR 0005 – Arquitectura de Consumo de Eventos (Tenant Service)

Status: Accepted  
Date: 2025-09-14  
Deciders: Equipo Backend SmartEdify  
Supersedes: N/A  
Relación: ADR 0004 (Publisher & Envelope Abstraction)

## Contexto
Tras implementar el patrón Outbox + Publisher (Logging/Kafka) y enriquecer el envelope (ADR 0004), era necesario cerrar el ciclo de propagación con un consumidor capaz de:

1. Procesar eventos de dominio publicados en Kafka (u otro broker futuro) de forma segura y observable.
2. Controlar concurrencia y reintentos sin bloquear particiones por mensajes problemáticos.
3. Exponer métricas que permitan detectar backlog (lag) y rendimiento real de handlers.
4. Permitir evolución incremental (solo lag → procesamiento real) minimizando riesgo inicial.

## Decisión
Se adopta una arquitectura de consumo con los siguientes elementos:

1. Registry de handlers (`consumer-handlers.ts`) indexado por `eventType` (clave `Envelope.type`).  
2. Consumidor especializado `KafkaProcessingConsumer` que:
   - Usa `eachBatch` (kafkajs) para control manual de offsets y concurrencia.
   - Aplica un límite configurable de inflight (`CONSUMER_MAX_CONCURRENCY`).
   - Resuelve (commit candidate) el offset únicamente tras éxito del handler.
3. Sistema de reintentos in-memory con backoff exponencial + jitter:
   - Clasificación heurística `transient` | `permanent` (regex sobre mensaje de error).
   - Parámetros: `CONSUMER_MAX_RETRIES`, `CONSUMER_RETRY_BASE_DELAY_MS`, `CONSUMER_RETRY_MAX_DELAY_MS`.
   - Errores permanentes o excedidos no resuelven offset ⇒ reentrega futura (más adelante: DLQ de consumidor).
4. Métricas Prometheus añadidas:
   - `consumer_events_processed_total{status,type}`
   - `consumer_process_duration_seconds{type}`
   - `consumer_retry_attempts_total{type}`
   - `consumer_inflight`
   - `consumer_handler_not_found_total{type}`
   - (Lag ya existente: `broker_consumer_lag`, `broker_consumer_lag_max`).
5. Lazy‑load dinámico de `kafkajs` para permitir pruebas offline/mocked (facilita tests aislados de lógica `processMessage`).
6. Exposición controlada de `processMessage` para tests de integración dirigidos, documentado como no‑API pública de producción.

## Alternativas Evaluadas
1. Procesamiento directo con `eachMessage` (kafkajs): descartado por menor control sobre lotes y commits por partición.
2. Uso inmediato de un DLQ de consumidor: pospuesto para simplificar la primera entrega y observar patrones reales de fallo.
3. Persistir reintentos en tabla intermedia: descartado inicialmente (overhead / latencia) a favor de reintentos in-memory y realimentación con lag.
4. Framework completo (e.g. Kafka Streams / Faust / Nest microservices): excesivo para volumen y fase actual.

## Consecuencias
Positivas:
* Observabilidad completa del pipeline (lag + throughput + errores + retries + latencia handlers).
* Bajo acoplamiento: los handlers solo dependen de su payload y contexto, sin lógica de reintentos en ellos.
* Diseño extensible hacia DLQ, tracing distribuido y esquema por evento (schema registry).

Negativas / Riesgos:
* Reintentos in-memory se pierden si el proceso cae (duplica costo al reiniciar). Mitigado por idempotencia recomendada en handlers.
* Falta de clasificación semántica profunda (heurística regex) puede sobre/infra cataloga errores. Se planifica refinamiento (códigos estandarizados o error taxonomy).
* Exposición de método interno para tests puede inducir mal uso accidental (se documenta claramente).

## Métricas Clave (SLO/SLA futuros)
| Métrica | Uso | Ejemplo de Alerta |
|---------|-----|-------------------|
| broker_consumer_lag_max | Backlog / capacidad | > 10k durante 5m |
| consumer_events_processed_total (ratio error) | Calidad handlers | error/total > 2% 15m |
| consumer_process_duration_seconds (p95) | Latencia negocio | p95 > 500ms 10m |
| consumer_retry_attempts_total | Salud dependencias externas | Crecimiento acelerado (>X/min) |
| consumer_inflight | Saturación interna | Cerca de maxConcurrency sostenido |

## Futuro / Próximos Pasos
* DLQ de consumidor (tabla o topic) para fallos permanentes persistentes.
* Integración con tracing (OpenTelemetry) para spans por evento.
* Enriquecer clasificación de errores (códigos/typed errors).
* Schema registry y validación per-evento (además del envelope genérico).
* Circuit breakers / bulkheading si un tipo de evento degrada el throughput.

## Referencias
* Código: `internal/adapters/consumer/*`
* Métricas: `internal/metrics/registry.ts`
* Envelope: ADR 0004
* Outbox & Publisher: README Tenant Service
