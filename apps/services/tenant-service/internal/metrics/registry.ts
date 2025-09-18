import client from 'prom-client';
import { initializePrometheusMetrics } from '@smartedify/shared/metrics';

const { registry } = initializePrometheusMetrics({ registry: new client.Registry() });

export { registry };

// Business metrics definitions (just registry wiring; increments in handlers later)
export const tenantCreatedTotal = new client.Counter({
  name: 'tenant_created_total',
  help: 'Total de tenants creados'
});
export const unitCreatedTotal = new client.Counter({
  name: 'unit_created_total',
  help: 'Total de unidades creadas'
});
export const membershipActiveGauge = new client.Gauge({
  name: 'membership_active',
  help: 'Número de memberships activas'
});
export const governanceTransferTotal = new client.Counter({
  name: 'governance_transfer_total',
  help: 'Transferencias admin (etiqueta result)',
  labelNames: ['result'] as const
});

// Outbox metrics
export const outboxPublishedTotal = new client.Counter({
  name: 'outbox_published_total',
  help: 'Eventos publicados desde la outbox'
});
export const outboxPublishFailedTotal = new client.Counter({
  name: 'outbox_publish_failed_total',
  help: 'Intentos de publicación fallidos'
});
export const outboxPublishAttemptsTotal = new client.Counter({
  name: 'outbox_publish_attempts_total',
  help: 'Intentos totales de publicación (incluye éxitos y fallos)'
});
export const outboxRetryTotal = new client.Counter({
  name: 'outbox_retry_total',
  help: 'Reintentos programados (incrementa cuando se re-calcula next_retry_at)'
});
export const outboxFailedPermanentTotal = new client.Counter({
  name: 'outbox_failed_permanent_total',
  help: 'Eventos marcados como fallo permanente (enviar a DLQ futura)'
});
export const outboxPublishLatency = new client.Histogram({
  name: 'outbox_publish_latency_seconds',
  help: 'Latencia desde created_at hasta published_at',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
export const outboxReprocessedTotal = new client.Counter({
  name: 'outbox_reprocessed_total',
  help: 'Eventos reprocesados desde la DLQ'
});
export const outboxPendingGauge = new client.Gauge({
  name: 'outbox_pending',
  help: 'Eventos pendientes de publicación'
});

// DLQ / Backlog Fase 0
export const outboxDlqSizeGauge = new client.Gauge({
  name: 'outbox_dlq_size',
  help: 'Número de eventos en la DLQ'
});
export const outboxEventAge = new client.Histogram({
  name: 'outbox_event_age_seconds',
  help: 'Edad (segundos) de eventos pending (crear->ahora) muestreada en cada ciclo',
  buckets: [0.1, 0.5, 1, 2, 5, 15, 30, 60, 120, 300, 600]
});
export const outboxDlqPurgedTotal = new client.Counter({
  name: 'outbox_dlq_purged_total',
  help: 'Eventos eliminados de la DLQ por operaciones de retención'
});

// Broker (fase 1 placeholder)
export const brokerPublishTotal = new client.Counter({
  name: 'broker_publish_total',
  help: 'Eventos publicados exitosamente al broker (publisher abstraction)'
});
export const brokerPublishFailedTotal = new client.Counter({
  name: 'broker_publish_failed_total',
  help: 'Eventos cuyo intento de publicación al broker falló'
});
export const brokerPublishLatency = new client.Histogram({
  name: 'broker_publish_latency_seconds',
  help: 'Latencia desde invoke publish() hasta confirmación broker (solo publishers reales)',
  buckets: [0.001,0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2]
});
export const brokerPayloadBytesTotal = new client.Counter({
  name: 'broker_payload_bytes_total',
  help: 'Bytes totales de payload enviados al broker (estimado tras serialización)'
});

// Health publisher/broker
export const brokerPublisherHealthGauge = new client.Gauge({
  name: 'broker_publisher_health',
  help: 'Estado del publisher/broker (1=up,0=down)'
});
export const brokerPublisherConnectFailTotal = new client.Counter({
  name: 'broker_publisher_connect_fail_total',
  help: 'Fallos al intentar conectar el publisher (inicio diferido)'
});
export const brokerDeadLetterMessagesGauge = new client.Gauge({
  name: 'broker_dead_letter_messages',
  help: 'Mensajes acumulados en la cola dead-letter del broker'
});

// Consumer lag
export const brokerConsumerLagGauge = new client.Gauge({
  name: 'broker_consumer_lag',
  help: 'Lag por topic/partition (logEndOffset - committedOffset)',
  labelNames: ['topic','partition'] as const
});
export const brokerConsumerLagMaxGauge = new client.Gauge({
  name: 'broker_consumer_lag_max',
  help: 'Lag máximo observado entre todas las particiones'
});
export const brokerConsumerLagPollFailedTotal = new client.Counter({
  name: 'broker_consumer_lag_poll_failed_total',
  help: 'Fallos al intentar obtener offsets para calcular lag'
});

// Consumer processing
export const consumerEventsProcessedTotal = new client.Counter({
  name: 'consumer_events_processed_total',
  help: 'Eventos procesados por el consumer (por status y tipo)',
  labelNames: ['status','type'] as const
});
export const consumerRetryAttemptsTotal = new client.Counter({
  name: 'consumer_retry_attempts_total',
  help: 'Intentos de reintento (transitorios) por tipo de evento',
  labelNames: ['type'] as const
});
export const consumerProcessDuration = new client.Histogram({
  name: 'consumer_process_duration_seconds',
  help: 'Duración del procesamiento de un evento (handler)',
  labelNames: ['type'] as const,
  buckets: [0.001,0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]
});
export const consumerInflightGauge = new client.Gauge({
  name: 'consumer_inflight',
  help: 'Número de eventos en procesamiento concurrente'
});
export const consumerHandlerNotFoundTotal = new client.Counter({
  name: 'consumer_handler_not_found_total',
  help: 'Eventos sin handler registrado por tipo de evento',
  labelNames: ['type'] as const
});

// Validación de envelope
export const outboxValidationFailedTotal = new client.Counter({
  name: 'outbox_validation_failed_total',
  help: 'Eventos descartados por validación antes de publicar',
  labelNames: ['reason'] as const
});

registry.registerMetric(tenantCreatedTotal);
registry.registerMetric(unitCreatedTotal);
registry.registerMetric(membershipActiveGauge);
registry.registerMetric(governanceTransferTotal);
registry.registerMetric(outboxPublishedTotal);
registry.registerMetric(outboxPublishFailedTotal);
registry.registerMetric(outboxPublishAttemptsTotal);
registry.registerMetric(outboxRetryTotal);
registry.registerMetric(outboxFailedPermanentTotal);
registry.registerMetric(outboxPublishLatency);
registry.registerMetric(outboxReprocessedTotal);
registry.registerMetric(outboxPendingGauge);
registry.registerMetric(outboxDlqSizeGauge);
registry.registerMetric(outboxEventAge);
registry.registerMetric(outboxDlqPurgedTotal);
registry.registerMetric(brokerPublishTotal);
registry.registerMetric(brokerPublishFailedTotal);
registry.registerMetric(brokerPublishLatency);
registry.registerMetric(brokerPayloadBytesTotal);
registry.registerMetric(outboxValidationFailedTotal);
registry.registerMetric(brokerPublisherHealthGauge);
registry.registerMetric(brokerPublisherConnectFailTotal);
registry.registerMetric(brokerDeadLetterMessagesGauge);
registry.registerMetric(brokerConsumerLagGauge);
registry.registerMetric(brokerConsumerLagMaxGauge);
registry.registerMetric(brokerConsumerLagPollFailedTotal);
registry.registerMetric(consumerEventsProcessedTotal);
registry.registerMetric(consumerRetryAttemptsTotal);
registry.registerMetric(consumerProcessDuration);
registry.registerMetric(consumerInflightGauge);
registry.registerMetric(consumerHandlerNotFoundTotal);
