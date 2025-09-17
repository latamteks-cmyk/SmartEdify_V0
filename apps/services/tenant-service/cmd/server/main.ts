/// <reference types="../..//types/fastify-di" />
// Copyright (c) 2024 SmartEdify contributors
// Licensed under the MIT License. See the LICENSE file in the project root for details.

import Fastify from 'fastify';
import { config } from '../../internal/config/env.js';
import { pool } from '../../internal/adapters/repo/db.js';
import { PgTenantRepository } from '../../internal/adapters/repo/tenant-pg.js';
import { PgUnitRepository } from '../../internal/adapters/repo/unit-pg.js';
import { PgMembershipRepository } from '../../internal/adapters/repo/membership-pg.js';
import { PgGovernanceRepository } from '../../internal/adapters/repo/governance-pg.js';
import { PgRolesRepository } from '../../internal/adapters/repo/roles-pg.js';
import { healthRoute } from '../../internal/adapters/http/routes/health.js';
import { metricsRoute } from '../../internal/adapters/http/routes/metrics.js';
import { tenantRoutes } from '../../internal/adapters/http/routes/tenants.js';
import { unitRoutes } from '../../internal/adapters/http/routes/units.js';
import { membershipRoutes } from '../../internal/adapters/http/routes/memberships.js';
import { governanceRoutes } from '../../internal/adapters/http/routes/governance.js';
import { tenantContextRoute } from '../../internal/adapters/http/routes/tenant-context.js';
import { outboxDlqRoutes } from '../../internal/adapters/http/routes/outbox-dlq.js';
import { PgOutboxRepository } from '../../internal/adapters/repo/outbox-pg.js';
import { OutboxPoller } from '../../internal/adapters/publisher/outbox-poller.js';
import { LoggingPublisher } from '../../internal/adapters/publisher/publisher.js';
import { KafkaPublisher } from '../../internal/adapters/publisher/kafka-publisher.js';
import { LoggingConsumer } from '../../internal/adapters/consumer/consumer.js';
import { KafkaLagConsumer } from '../../internal/adapters/consumer/kafka-consumer.js';
import { RabbitMqPublisher } from '../../internal/adapters/publisher/rabbitmq-publisher.js';
import { RabbitMqDeadLetterConsumer } from '../../internal/adapters/consumer/rabbitmq-dead-letter-consumer.js';
import { authJwtPlugin } from '../../internal/adapters/http/plugins/auth-jwt.js';
import { startTracing, shutdownTracing } from '../../internal/observability/tracing.js';
import { JwksProvider } from '../../internal/adapters/security/jwks-provider.js';

async function build() {
  await startTracing();
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: process.env.NODE_ENV === 'production' ? undefined : {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
      }
    }
  });

  // Simple DI container
  const di = {
    tenantRepo: new PgTenantRepository(),
    unitRepo: new PgUnitRepository(),
    membershipRepo: new PgMembershipRepository(),
    governanceRepo: new PgGovernanceRepository(),
    rolesRepo: new PgRolesRepository(),
    outboxRepo: new PgOutboxRepository()
  } as const;
  app.decorate('di', di);

  let publisher: any;
  if (config.publisherKind === 'kafka' && config.kafkaBrokers.length > 0) {
    publisher = new KafkaPublisher({
      brokers: config.kafkaBrokers,
      clientId: config.kafkaClientId,
      topicPrefix: config.kafkaTopicPrefix,
      acks: config.kafkaAcks,
      logger: app.log
    });
    app.log.info({ brokers: config.kafkaBrokers }, 'KafkaPublisher enabled');
  } else if (config.publisherKind === 'rabbitmq') {
    publisher = new RabbitMqPublisher({
      url: config.rabbitUrl,
      exchange: config.rabbitExchange,
      routingKey: config.rabbitRoutingKey,
      queue: config.rabbitQueue,
      deadLetterExchange: config.rabbitDeadLetterExchange,
      deadLetterQueue: config.rabbitDeadLetterQueue,
      deadLetterRoutingKey: config.rabbitDeadLetterRoutingKey,
      logger: app.log
    });
    app.log.info({ exchange: config.rabbitExchange, queue: config.rabbitQueue }, 'RabbitMqPublisher enabled');
  } else {
    publisher = new LoggingPublisher(app.log);
    if (config.publisherKind === 'kafka') {
      app.log.warn('Kafka requested but no brokers configured, falling back to LoggingPublisher');
    } else if (config.publisherKind === 'rabbitmq') {
      app.log.warn('RabbitMQ requested but no configuration provided, falling back to LoggingPublisher');
    }
  }
  const poller = new OutboxPoller(di.outboxRepo, publisher, { intervalMs: config.outboxPollIntervalMs, batchSize: config.outboxBatchSize, logger: app.log });
  ;(app as any).publisher = publisher; // exposición para health route
  poller.start();

  // Consumer (solo lag por ahora)
  let consumer: any = null;
  if (config.consumerKind === 'kafka' && config.kafkaBrokers.length > 0) {
    consumer = new KafkaLagConsumer({
      brokers: config.kafkaBrokers,
      clientId: config.kafkaClientId + '-lag',
      groupId: config.kafkaConsumerGroupId,
      topicPrefix: config.kafkaTopicPrefix,
      lagIntervalMs: config.kafkaConsumerLagIntervalMs,
      logger: app.log
    });
    consumer.start().catch((e: any) => app.log.error(e, 'consumer start failed'));
  } else if (config.consumerKind === 'rabbitmq') {
    consumer = new RabbitMqDeadLetterConsumer({
      url: config.rabbitUrl,
      exchange: config.rabbitExchange,
      routingKey: config.rabbitRoutingKey,
      queue: config.rabbitQueue,
      deadLetterExchange: config.rabbitDeadLetterExchange,
      deadLetterQueue: config.rabbitDeadLetterQueue,
      deadLetterRoutingKey: config.rabbitDeadLetterRoutingKey,
      checkIntervalMs: config.rabbitDeadLetterCheckIntervalMs,
      alertThreshold: config.rabbitDeadLetterAlertThreshold,
      logger: app.log
    });
    consumer.start().catch((e: any) => app.log.error(e, 'rabbitmq dead-letter consumer failed'));
  } else if (config.consumerKind === 'logging') {
    consumer = new LoggingConsumer();
    await consumer.start();
  }

  await app.register(metricsRoute);
  await app.register(healthRoute);

  // Registrar plugin de auth: se prioriza JWKS si está configurado; fallback a clave estática
  let jwksProvider: JwksProvider | undefined;
  if (config.jwksUrl) {
    jwksProvider = new JwksProvider({ url: config.jwksUrl, cacheTtlMs: config.jwksCacheTtlMs, logger: app.log });
  }
  const publicKey = process.env.TENANT_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
  await app.register(authJwtPlugin, { publicKeyPem: publicKey, jwksProvider, required: false });

  await app.register(tenantRoutes);
  await app.register(unitRoutes);
  await app.register(membershipRoutes);
  await app.register(governanceRoutes);
  await app.register(tenantContextRoute);
  await app.register(outboxDlqRoutes);

  app.addHook('onClose', async () => {
    await pool.end();
    await poller.stop();
    if (consumer) { await consumer.shutdown().catch(() => {}); }
    await shutdownTracing().catch(e => app.log.error(e, 'tracing shutdown error'));
  });

  return app;
}

build().then(app => {
  app.listen({ port: config.port, host: '0.0.0.0' })
    .then(() => app.log.info(`tenant-service listening on ${config.port}`))
    .catch(err => {
      app.log.error(err, 'startup error');
      process.exit(1);
    });
});
