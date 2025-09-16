import 'dotenv/config';

export interface TenantConfig {
  port: number;
  logLevel: string;
  dbUrl: string;
  outboxPollIntervalMs: number;
  outboxBatchSize: number;
  contextCacheTtlMs: number;
  jwksUrl?: string;
  jwksCacheTtlMs: number;
  publisherKind: 'logging' | 'kafka' | 'rabbitmq';
  kafkaBrokers: string[];
  kafkaClientId: string;
  kafkaTopicPrefix: string;
  kafkaAcks: number;
  outboxMaxPayloadBytes: number; // límite de validación de payload serializado
  consumerKind: 'none' | 'logging' | 'kafka' | 'rabbitmq';
  kafkaConsumerGroupId: string;
  kafkaConsumerLagIntervalMs: number;
  consumerMaxRetries: number;
  consumerRetryBaseDelayMs: number;
  consumerRetryMaxDelayMs: number;
  rabbitUrl: string;
  rabbitExchange: string;
  rabbitRoutingKey: string;
  rabbitQueue: string;
  rabbitDeadLetterExchange: string;
  rabbitDeadLetterQueue: string;
  rabbitDeadLetterRoutingKey?: string;
  rabbitDeadLetterCheckIntervalMs: number;
  rabbitDeadLetterAlertThreshold: number;
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const config: TenantConfig = {
  port: parseInt(process.env.TENANT_PORT || '8083', 10),
  logLevel: process.env.TENANT_LOG_LEVEL || 'info',
  dbUrl: required('TENANT_DB_URL', process.env.TENANT_DB_URL),
  outboxPollIntervalMs: parseInt(process.env.TENANT_OUTBOX_POLL_INTERVAL_MS || '500', 10),
  outboxBatchSize: parseInt(process.env.TENANT_OUTBOX_BATCH_SIZE || '50', 10),
  contextCacheTtlMs: parseInt(process.env.TENANT_CONTEXT_CACHE_TTL_MS || '60000', 10)
  ,jwksUrl: process.env.TENANT_JWKS_URL,
  jwksCacheTtlMs: parseInt(process.env.TENANT_JWKS_CACHE_TTL_MS || '600000', 10),
  publisherKind: (process.env.TENANT_PUBLISHER || 'logging') as 'logging' | 'kafka' | 'rabbitmq',
  kafkaBrokers: (process.env.KAFKA_BROKERS || '').split(',').filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'tenant-service',
  kafkaTopicPrefix: process.env.KAFKA_TOPIC_PREFIX || 'tenant',
  kafkaAcks: parseInt(process.env.KAFKA_ACKS || '-1', 10),
  outboxMaxPayloadBytes: parseInt(process.env.OUTBOX_MAX_PAYLOAD_BYTES || '65536', 10),
  consumerKind: (process.env.TENANT_CONSUMER || 'none') as 'none' | 'logging' | 'kafka' | 'rabbitmq',
  kafkaConsumerGroupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'tenant-service-consumer',
  kafkaConsumerLagIntervalMs: parseInt(process.env.KAFKA_CONSUMER_LAG_INTERVAL_MS || '10000', 10)
  ,consumerMaxRetries: parseInt(process.env.CONSUMER_MAX_RETRIES || '5', 10)
  ,consumerRetryBaseDelayMs: parseInt(process.env.CONSUMER_RETRY_BASE_DELAY_MS || '100', 10)
  ,consumerRetryMaxDelayMs: parseInt(process.env.CONSUMER_RETRY_MAX_DELAY_MS || '2000', 10)
  ,rabbitUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672'
  ,rabbitExchange: process.env.RABBITMQ_EXCHANGE || 'tenant.events'
  ,rabbitRoutingKey: process.env.RABBITMQ_ROUTING_KEY || 'tenant.event'
  ,rabbitQueue: process.env.RABBITMQ_QUEUE || 'tenant-events'
  ,rabbitDeadLetterExchange: process.env.RABBITMQ_DLX || 'dlx'
  ,rabbitDeadLetterQueue: process.env.RABBITMQ_DEAD_LETTER_QUEUE || 'dead-letter'
  ,rabbitDeadLetterRoutingKey: process.env.RABBITMQ_DEAD_LETTER_ROUTING_KEY || undefined
  ,rabbitDeadLetterCheckIntervalMs: parseInt(process.env.RABBITMQ_DLQ_CHECK_INTERVAL_MS || '30000', 10)
  ,rabbitDeadLetterAlertThreshold: parseInt(process.env.RABBITMQ_DLQ_ALERT_THRESHOLD || '1', 10)
};
