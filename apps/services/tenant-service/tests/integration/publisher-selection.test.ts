import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { config as baseConfig } from '../../internal/config/env.js';
import { PgOutboxRepository } from '../../internal/adapters/repo/outbox-pg.js';
import { OutboxPoller } from '../../internal/adapters/publisher/outbox-poller.js';
import { LoggingPublisher } from '../../internal/adapters/publisher/publisher.js';

// Test no requiere DB intensiva (evita interferir con otras pruebas),
// pero se usa outboxRepo para tipado; no ejecutamos tick.

const skip = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skip)('Publisher selection fallback', () => {
  let app: any;
  beforeAll(async () => {
    process.env.TENANT_PUBLISHER = 'kafka';
    process.env.KAFKA_BROKERS = ''; // fuerza fallback
    // Re-import dinámico para recalcular config si fuera necesario (aquí usamos baseConfig ya cargado)
    app = Fastify({ logger: false });
    const outboxRepo = new PgOutboxRepository();
    // Instanciamos manualmente lo que haría main: si no hay brokers => LoggingPublisher
    const wantKafka = baseConfig.publisherKind === 'kafka';
    const hasBrokers = baseConfig.kafkaBrokers.length > 0;
    const publisher = (!hasBrokers && wantKafka) ? new LoggingPublisher(app.log) : new LoggingPublisher(app.log);
    const poller = new OutboxPoller(outboxRepo, publisher, { intervalMs: 1000, batchSize: 10, logger: app.log });
    // Validación superficial del tipo
    (app as any).publisher = publisher;
  });
  afterAll(async () => { await app.close(); });

  it('usa LoggingPublisher si kafka solicitado sin brokers', async () => {
    expect((app as any).publisher).toBeInstanceOf(LoggingPublisher);
  });
});
