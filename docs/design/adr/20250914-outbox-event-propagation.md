# ADR 0003: Outbox Event Propagation Pattern

Fecha: 2025-09-14
Estado: Propuesto (Implementación inicial parcial lista)
Autores: Plataforma / Backend

## Contexto
El ecosistema SmartEdify evoluciona hacia arquitectura orientada a eventos para desacoplar microservicios (Auth, Tenant, User, Assembly, frontends) y permitir extensibilidad (reactivar proyecciones, auditoría, analítica). Actualmente:
- Existe tabla `outbox_events` en Tenant Service (creada en migraciones iniciales) y eventos como `governance.changed`.
- No hay aún publicador asíncrono ni bus definitivo (Kafka / NATS / Redpanda evaluados).
- La lógica de reintentos y backoff temporal para fallos transitorios se añadió y probó; todavía falta DLQ y métrica backlog.
- Se reforzó la idempotencia de migraciones y se necesita el mismo rigor para eventos (deduplicación por `event_id`).

Problemas a resolver:
1. Acoplamiento directo si servicios llaman HTTP de forma síncrona para propagar cambios.
2. Riesgo de pérdida o duplicación de eventos si se publica dentro de la misma transacción sin confirmación fiable.
3. Necesidad de retries controlados y visibilidad operativa (latencia, backlog, tasa de fallos permanentes).

## Decisión
Adoptar patrón Outbox transaccional con publicador asíncrono confiable:
1. Persistir evento en tabla `outbox_events` dentro de la misma transacción que la mutación de dominio.
2. Un worker (poller) periódico consulta lote ordenado por `next_retry_at, created_at` y publica al broker elegido.
3. Control de reintentos incremental (backoff lineal inicialmente, luego exponencial). Campos: `retry_count`, `next_retry_at`, `last_error`.
4. Marcar eventos como `published_at` en éxito. En fallo temporal recalcular `next_retry_at`. En fallo definitivo (reglas) mover a DLQ (tabla `outbox_events_dlq`).
5. Garantizar idempotencia downstream usando `event_id` (UUID v7) como clave de de-duplicación.
6. Añadir métricas Prometheus: `outbox_publish_attempts_total`, `outbox_published_total`, `outbox_retry_total`, `outbox_failed_permanent_total`, `outbox_backlog_gauge`.
7. Alertas SRE: backlog > umbral (p.e. 500) o edad promedio > 60s.

## Alternativas Consideradas
| Alternativa | Pros | Contras |
|-------------|------|---------|
| Publicar directamente dentro de la transacción | Simplicidad | Rollo back parcial, riesgo de publicación sin commit real (doble escritura) |
| CDC (Change Data Capture) vía Debezium | Minimiza código app | Operación infra compleja, latencia impredecible, filtrado semántico adicional |
| Webhooks síncronos | Fácil inicio | Acoplamiento, latencia compuesta, baja resiliencia |
| Event Sourcing completo | Historial completo | Complejidad alta, no requerido para MVP |

Elegimos Outbox transaccional por equilibrio entre simplicidad operativa y garantías de consistencia eventual.

## Consecuencias
Positivas:
- Consistencia eventual confiable sin acoplar lógica de dominio al broker.
- Control explícito de reintentos y DLQ facilita operaciones.
- Métricas y alertas habilitan observabilidad temprana.

Negativas / Costes:
- Lógica adicional (poller + mantenimiento + limpieza histórica).
- Latencia añadida (poll interval) frente a publicación directa.
- Gestión de evolución de esquema outbox y DLQ.

## Implementación (Fases)
1. (Listo) Persistencia de eventos y pruebas de reintentos básicos.
2. (Pendiente) Worker poller (intervalo 500ms - 2s adaptativo) con locking (FOR UPDATE SKIP LOCKED) para concurrencia segura.
3. (Pendiente) Integración broker (preferencia NATS JetStream por simplicidad y persistencia ligera; fallback Kafka si necesidades de throughput > 10K eps).
4. (Pendiente) Métricas y alertas + dashboard (Grafana panel backlog, latencia publish, tasa fallos).
5. (Pendiente) DLQ y comando de reprocess manual (CLI / endpoint admin).
6. (Pendiente) Idempotencia downstream ejemplo (consumer registra `processed_event_ids`).
7. (Pendiente) Backoff exponencial con jitter y límite máximo (p.e. 5m) + clasificación errores permanentes.
8. (Pendiente) Limpieza eventos publicados > N días (job programado) y particionado futuro.

## Detalles Técnicos
Tabla actual `outbox_events` (resumen esperado):
- id (uuid v7)
- aggregate_type, aggregate_id
- event_type
- payload (jsonb)
- retry_count (int)
- next_retry_at (timestamptz)
- published_at (timestamptz nullable)
- created_at, updated_at

Indices necesarios:
- idx_outbox_ready (next_retry_at WHERE published_at IS NULL)
- idx_outbox_published_at (para limpieza)

Worker pseudocódigo:
```
BEGIN;
SELECT * FROM outbox_events
 WHERE published_at IS NULL
   AND next_retry_at <= now()
 ORDER BY next_retry_at, created_at
 LIMIT $BATCH FOR UPDATE SKIP LOCKED;
COMMIT; // o procesar dentro manteniendo transacción pequeña

for evento in lote:
  try publish(evento)
    mark published_at=now()
  catch error transient -> retry_count++, next_retry_at=now()+backoff(retry_count)
  catch error permanent -> mover a DLQ
```

Backoff inicial: `baseDelayMs = 50`, incremento lineal `baseDelayMs * retry_count` (implementado). Evolución: exponencial `min(initial * 2^(n-1), maxDelay)` + jitter aleatorio 0-20%.

Errores permanentes: clasificación por códigos del broker o validación semántica (payload inválido) -> mover a DLQ inmediatamente.

## Métricas (Definición)
- Counter `outbox_publish_attempts_total{service}`
- Counter `outbox_published_total{service}`
- Counter `outbox_retry_total{service}`
- Counter `outbox_failed_permanent_total{service}`
- Gauge `outbox_backlog_gauge{service}` (eventos pendientes)
- Histogram `outbox_publish_latency_seconds{service}` (desde created_at hasta published_at)

## Observabilidad y Alertas
Alertas iniciales:
- Backlog > 500 por 5m
- Edad P95 publish latency > 30s
- Fallos permanentes ratio > 1% últimas 15m

## Pruebas
- Unit: cálculo backoff, clasificación errores, función publish wrapper.
- Integración: insertar eventos -> simular fallos temporales -> verificar escalado `next_retry_at` y publicación exitosa.
- E2E (posterior): consumir desde broker y verificar idempotencia con doble envío.

## Riesgos y Mitigaciones
| Riesgo | Mitigación |
|--------|------------|
| Bloqueo prolongado en SELECT | Lotes pequeños (<=50) y transacciones cortas |
| Retries produce tormenta | Backoff exponencial + jitter |
| DLQ crecimiento ilimitado | Política retención + métrica y alerta |
| Desorden temporal | Orden por `created_at` secundario reduce reordenamiento |

## Migraciones Futuras
- Añadir columna `error_class` y `last_error_at`.
- Crear tabla `outbox_events_dlq`.
- Indices parciales para estado listo.

## Seguimiento / TODO
- Implementar worker poller (prioridad alta)
- Instrumentar métricas Prometheus
- Integrar broker (NATS JetStream POC)
- Añadir DLQ y comando reprocess
- Exponenciar backoff con jitter
- Limpieza automática y retención configurable

## Decisión Revisit
Reevaluar cuando: throughput > 5K eventos/s, necesidad orden global estricto, o aparición de múltiples consumidores con diferentes QoS.

---
