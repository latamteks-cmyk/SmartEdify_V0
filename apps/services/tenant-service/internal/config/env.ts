import { z } from 'zod';
import 'dotenv/config';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['test', 'development', 'production']).default('development'),
  TENANT_PORT: z.coerce.number().default(8083).optional(),
  TENANT_LOG_LEVEL: z.string().default('info').optional(),
  TENANT_DB_URL: z.string().url().optional(),
  // Postgres helpers para construir URL en dev/test si falta TENANT_DB_URL
  PGHOST: z.string().default('localhost').optional(),
  PGPORT: z.coerce.number().default(5542).optional(),
  POSTGRES_USER: z.string().default('postgres').optional(),
  POSTGRES_PASSWORD: z.string().default('postgres').optional(),
  POSTGRES_DB: z.string().default('smartedify').optional(),
  // Otros toggles usados en tests
  SKIP_DB_TESTS: z.enum(['0', '1']).default('0').optional(),
  // Seguridad/JWT opcional (preferimos JWKS cuando se configure)
  TENANT_JWKS_URL: z.string().url().optional(),
  TENANT_JWKS_CACHE_TTL_MS: z.coerce.number().default(600000).optional(),
  TENANT_JWT_PUBLIC_KEY: z.string().optional(),
  // Publisher/Consumer
  TENANT_PUBLISHER: z.enum(['logging', 'kafka', 'rabbitmq']).default('logging').optional(),
  KAFKA_BROKERS: z.string().optional(),
  KAFKA_CLIENT_ID: z.string().default('tenant-service').optional(),
  KAFKA_TOPIC_PREFIX: z.string().default('tenant').optional(),
  KAFKA_ACKS: z.coerce.number().default(-1).optional(),
  TENANT_CONSUMER: z.enum(['none', 'logging', 'kafka', 'rabbitmq']).default('none').optional(),
  KAFKA_CONSUMER_GROUP_ID: z.string().default('tenant-service-consumer').optional(),
  KAFKA_CONSUMER_LAG_INTERVAL_MS: z.coerce.number().default(10000).optional(),
  RABBITMQ_URL: z.string().default('amqp://guest:guest@rabbitmq:5672').optional(),
  RABBITMQ_EXCHANGE: z.string().default('tenant.events').optional(),
  RABBITMQ_ROUTING_KEY: z.string().default('tenant.event').optional(),
  RABBITMQ_QUEUE: z.string().default('tenant-events').optional(),
  RABBITMQ_DLX: z.string().default('dlx').optional(),
  RABBITMQ_DEAD_LETTER_QUEUE: z.string().default('dead-letter').optional(),
  RABBITMQ_DEAD_LETTER_ROUTING_KEY: z.string().optional(),
  RABBITMQ_DLQ_CHECK_INTERVAL_MS: z.coerce.number().default(30000).optional(),
  RABBITMQ_DLQ_ALERT_THRESHOLD: z.coerce.number().default(1).optional(),
  TENANT_OUTBOX_POLL_INTERVAL_MS: z.coerce.number().default(500).optional(),
  TENANT_OUTBOX_BATCH_SIZE: z.coerce.number().default(50).optional(),
  OUTBOX_MAX_PAYLOAD_BYTES: z.coerce.number().default(65536).optional(),
  // Cache de contexto
  TENANT_CONTEXT_CACHE_TTL_MS: z.coerce.number().default(60000).optional(),
  // Parámetros de reintentos del consumidor
  CONSUMER_MAX_RETRIES: z.coerce.number().default(5).optional(),
  CONSUMER_RETRY_BASE_DELAY_MS: z.coerce.number().default(100).optional(),
  CONSUMER_RETRY_MAX_DELAY_MS: z.coerce.number().default(2000).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(env: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.parse(env);
  // fail-fast en producción si falta DB URL
  if (parsed.NODE_ENV === 'production' && !parsed.TENANT_DB_URL) {
    throw new Error('TENANT_DB_URL es obligatorio en producción');
  }
  // Validaciones mínimas por publisher/consumer en producción
  if (parsed.NODE_ENV === 'production') {
    if (parsed.TENANT_PUBLISHER === 'kafka' && (!parsed.KAFKA_BROKERS || parsed.KAFKA_BROKERS.trim() === '')) {
      throw new Error('KAFKA_BROKERS es obligatorio cuando TENANT_PUBLISHER=kafka');
    }
    if (parsed.TENANT_PUBLISHER === 'rabbitmq' && (!parsed.RABBITMQ_URL || parsed.RABBITMQ_URL.trim() === '')) {
      throw new Error('RABBITMQ_URL es obligatorio cuando TENANT_PUBLISHER=rabbitmq');
    }
    if (parsed.TENANT_CONSUMER === 'kafka' && (!parsed.KAFKA_BROKERS || parsed.KAFKA_BROKERS.trim() === '')) {
      throw new Error('KAFKA_BROKERS es obligatorio cuando TENANT_CONSUMER=kafka');
    }
  }
  return parsed;
}

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

const env = parseEnv(process.env);

function buildDbUrl(e: Env): string {
  if (e.TENANT_DB_URL) return e.TENANT_DB_URL;
  // Construcción auxiliar en dev/test
  const user = e.POSTGRES_USER || 'postgres';
  const pass = e.POSTGRES_PASSWORD || 'postgres';
  const db = e.POSTGRES_DB || 'smartedify';
  const host = e.PGHOST || 'localhost';
  const port = String(e.PGPORT || 5542);
  return `postgres://${user}:${pass}@${host}:${port}/${db}`;
}

export const config: TenantConfig = {
  port: env.TENANT_PORT ?? 8083,
  logLevel: env.TENANT_LOG_LEVEL || 'info',
  dbUrl: buildDbUrl(env),
  outboxPollIntervalMs: env.TENANT_OUTBOX_POLL_INTERVAL_MS ?? 500,
  outboxBatchSize: env.TENANT_OUTBOX_BATCH_SIZE ?? 50,
  contextCacheTtlMs: env.TENANT_CONTEXT_CACHE_TTL_MS ?? 60000,
  jwksUrl: env.TENANT_JWKS_URL,
  jwksCacheTtlMs: env.TENANT_JWKS_CACHE_TTL_MS ?? 600000,
  publisherKind: (env.TENANT_PUBLISHER || 'logging') as 'logging' | 'kafka' | 'rabbitmq',
  kafkaBrokers: (env.KAFKA_BROKERS || '').split(',').filter(Boolean),
  kafkaClientId: env.KAFKA_CLIENT_ID || 'tenant-service',
  kafkaTopicPrefix: env.KAFKA_TOPIC_PREFIX || 'tenant',
  kafkaAcks: env.KAFKA_ACKS ?? -1,
  outboxMaxPayloadBytes: env.OUTBOX_MAX_PAYLOAD_BYTES ?? 65536,
  consumerKind: (env.TENANT_CONSUMER || 'none') as 'none' | 'logging' | 'kafka' | 'rabbitmq',
  kafkaConsumerGroupId: env.KAFKA_CONSUMER_GROUP_ID || 'tenant-service-consumer',
  kafkaConsumerLagIntervalMs: env.KAFKA_CONSUMER_LAG_INTERVAL_MS ?? 10000,
  consumerMaxRetries: env.CONSUMER_MAX_RETRIES ?? 5,
  consumerRetryBaseDelayMs: env.CONSUMER_RETRY_BASE_DELAY_MS ?? 100,
  consumerRetryMaxDelayMs: env.CONSUMER_RETRY_MAX_DELAY_MS ?? 2000,
  rabbitUrl: env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  rabbitExchange: env.RABBITMQ_EXCHANGE || 'tenant.events',
  rabbitRoutingKey: env.RABBITMQ_ROUTING_KEY || 'tenant.event',
  rabbitQueue: env.RABBITMQ_QUEUE || 'tenant-events',
  rabbitDeadLetterExchange: env.RABBITMQ_DLX || 'dlx',
  rabbitDeadLetterQueue: env.RABBITMQ_DEAD_LETTER_QUEUE || 'dead-letter',
  rabbitDeadLetterRoutingKey: env.RABBITMQ_DEAD_LETTER_ROUTING_KEY || undefined,
  rabbitDeadLetterCheckIntervalMs: env.RABBITMQ_DLQ_CHECK_INTERVAL_MS ?? 30000,
  rabbitDeadLetterAlertThreshold: env.RABBITMQ_DLQ_ALERT_THRESHOLD ?? 1,
};
