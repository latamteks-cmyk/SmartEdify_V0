import { describe, it, expect, beforeEach } from 'vitest';
import { registerHandler } from '../../internal/adapters/consumer/consumer-handlers.js';
import { KafkaProcessingConsumer } from '../../internal/adapters/consumer/kafka-processing-consumer.js';
import { consumerEventsProcessedTotal, consumerRetryAttemptsTotal, consumerHandlerNotFoundTotal, registry } from '../../internal/metrics/registry.js';

describe('Consumer processing', () => {
  beforeEach(() => {
    // limpiar metrics relevantes (prom-client no soporta reset parcial nativamente; usamos resetMetrics en cada) 
    consumerEventsProcessedTotal.reset();
    consumerRetryAttemptsTotal.reset();
    consumerHandlerNotFoundTotal.reset();
  });

  it('procesa evento con reintentos transitorios y termina success', async () => {
    let attempts = 0;
    registerHandler('demo.event', async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('timeout simulated');
      }
      // éxito a la tercera
    });
    const consumer = new KafkaProcessingConsumer({
      brokers: ['localhost:9092'],
      clientId: 'test',
      groupId: 'g1',
      topic: 't',
      maxConcurrency: 2,
      maxRetries: 5,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 5,
      logger: { warn: () => {}, error: () => {}, debug: () => {} }
    });
    const env = {
      id: '00000000-0000-0000-0000-000000000001',
      aggregateType: 'agg',
      aggregateId: '00000000-0000-0000-0000-000000000002',
      type: 'demo.event',
      payload: { a: 1 },
      createdAt: new Date(),
      occurredAt: new Date(),
      schemaVersion: 1,
      eventVersion: 1
    } as any;
    await consumer.processMessage('t', 0, '0', Buffer.from(JSON.stringify(env)));

    // Debe haber 1 success y 2 reintentos registrados (transitorios)
  const processedMetrics: any = await consumerEventsProcessedTotal.get();
  const m = processedMetrics.values.find((v: any) => v.labels.type === 'demo.event' && v.labels.status === 'success');
  expect(m?.value).toBe(1);
  const retryMetrics: any = await consumerRetryAttemptsTotal.get();
  const retries = retryMetrics.values.find((v: any) => v.labels.type === 'demo.event');
  expect(retries?.value).toBe(2);
  });

  it('incrementa handler_not_found cuando no existe', async () => {
    const consumer = new KafkaProcessingConsumer({
      brokers: ['localhost:9092'],
      clientId: 'test',
      groupId: 'g1',
      topic: 't',
      maxConcurrency: 1,
      maxRetries: 1,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 5,
      logger: { warn: () => {}, error: () => {}, debug: () => {} }
    });
    const env = {
      id: '00000000-0000-0000-0000-000000000010',
      aggregateType: 'agg',
      aggregateId: '00000000-0000-0000-0000-000000000011',
      type: 'missing.event',
      payload: {},
      createdAt: new Date(),
      occurredAt: new Date(),
      schemaVersion: 1,
      eventVersion: 1
    } as any;
    await consumer.processMessage('t', 0, '0', Buffer.from(JSON.stringify(env)));
  const notFoundMetrics: any = await consumerHandlerNotFoundTotal.get();
  const notFound = notFoundMetrics.values.find((v: any) => v.labels.type === 'missing.event');
  expect(notFound?.value).toBe(1);
  });
});
