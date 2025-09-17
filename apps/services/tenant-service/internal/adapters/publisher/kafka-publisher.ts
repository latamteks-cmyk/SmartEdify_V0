import { Kafka, logLevel, Producer } from 'kafkajs';
import { Publisher, OutboxEnvelope, PublisherResult } from './publisher.js';
import { brokerPublishFailedTotal, brokerPublishLatency, brokerPublishTotal, brokerPayloadBytesTotal, brokerPublisherHealthGauge, brokerPublisherConnectFailTotal } from '../../metrics/registry.js';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { validateEvent } from '../../domain/event-schemas.js';

export interface KafkaPublisherOptions {
  brokers: string[];
  clientId: string;
  topicPrefix?: string;
  acks?: number; // -1 all, 0 none, 1 leader
  logger?: any;
}

export class KafkaPublisher implements Publisher {
  private kafka: Kafka;
  private producer: Producer;
  private topicPrefix: string;
  private started = false;

  constructor(private opts: KafkaPublisherOptions) {
    this.kafka = new Kafka({
      clientId: opts.clientId,
      brokers: opts.brokers,
      logLevel: logLevel.NOTHING
    });
    this.producer = this.kafka.producer({ allowAutoTopicCreation: false });
    this.topicPrefix = opts.topicPrefix || 'tenant';
  }

  private topicFor(ev: OutboxEnvelope): string {
    // Convención: <prefix>.<aggregateType>
    return `${this.topicPrefix}.${ev.aggregateType}`;
  }

  async ensureStarted() {
    if (!this.started) {
      try {
        await this.producer.connect();
        this.started = true;
        brokerPublisherHealthGauge.set(1);
      } catch (e) {
        brokerPublisherConnectFailTotal.inc();
        brokerPublisherHealthGauge.set(0);
        throw e;
      }
    }
  }

  async publish(ev: OutboxEnvelope): Promise<PublisherResult> {
    const tracer = trace.getTracer('tenant-service');
    return await tracer.startActiveSpan('kafka.publish', { attributes: {
      'messaging.system': 'kafka',
      'messaging.destination': this.topicFor(ev),
      'event.type': ev.type,
      'tenant.id': ev.tenantId || 'unknown',
      'event.trace_id': ev.traceId || undefined,
      'event.span_id': ev.spanId || undefined
    } }, async (span) => {
      const start = process.hrtime.bigint();
      try {
        // Validación schema
        const validation = validateEvent({ type: ev.type, eventVersion: ev.eventVersion, schemaVersion: ev.schemaVersion, payload: ev.payload });
        if (!validation.ok) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'schema_validation_failed' });
          span.setAttribute('event.validation.failed', true);
          span.setAttribute('event.validation.errors', JSON.stringify(validation.errors));
          this.opts.logger?.warn({ id: ev.id, type: ev.type, errors: validation.errors }, 'kafka publisher validation failed');
          span.end();
          return { ok: false, error: new Error('schema_validation_failed') };
        }
        await this.ensureStarted();
        const payload = JSON.stringify({
          id: ev.id,
          type: ev.type,
          aggregateType: ev.aggregateType,
          aggregateId: ev.aggregateId,
          payload: ev.payload,
          createdAt: ev.createdAt.toISOString(),
          occurredAt: ev.occurredAt.toISOString(),
          schemaVersion: ev.schemaVersion,
          eventVersion: ev.eventVersion,
          tenantId: ev.tenantId,
          correlationId: ev.correlationId,
          partitionKey: ev.partitionKey,
          headers: ev.headers,
          traceId: ev.traceId,
          spanId: ev.spanId
        });
        const topic = this.topicFor(ev);
        span.setAttribute('messaging.destination', topic);
        await this.producer.send({
          topic,
          messages: [ { key: ev.partitionKey || ev.aggregateId, value: payload, headers: ev.headers as any } ],
          acks: this.opts.acks === undefined ? -1 : this.opts.acks
        });
        brokerPublishTotal.inc();
        brokerPayloadBytesTotal.inc(Buffer.byteLength(payload, 'utf8'));
        const end = process.hrtime.bigint();
        const seconds = Number(end - start) / 1e9;
        brokerPublishLatency.observe(seconds);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return { ok: true };
      } catch (error: any) {
        brokerPublishFailedTotal.inc();
        const end = process.hrtime.bigint();
        const seconds = Number(end - start) / 1e9;
        brokerPublishLatency.observe(seconds);
        this.opts.logger?.error({ err: error }, 'kafka publish failed');
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
        span.end();
        return { ok: false, error };
      }
    });
  }

  async shutdown(): Promise<void> {
    if (this.started) {
      await this.producer.disconnect();
      this.started = false;
      brokerPublisherHealthGauge.set(0);
    }
  }

  async health(): Promise<{ ok: boolean; details?: any }> {
    try {
      await this.ensureStarted();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, details: { error: e?.message } };
    }
  }
}
