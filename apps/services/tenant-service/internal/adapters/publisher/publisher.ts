import { Envelope as OutboxEnvelope } from '../../domain/envelope.js';
export type { OutboxEnvelope };
import { validateEvent } from '../../domain/event-schemas.js';

export interface PublisherResult {
  ok: boolean;
  error?: any;
}

export interface Publisher {
  publish(ev: OutboxEnvelope): Promise<PublisherResult>;
  shutdown?(): Promise<void>;
  health?(): Promise<{ ok: boolean; details?: any }>;
}

export class LoggingPublisher implements Publisher {
  constructor(private logger: any) {}
  async publish(ev: OutboxEnvelope): Promise<PublisherResult> {
    const validation = validateEvent({
      type: ev.type,
      eventVersion: ev.eventVersion,
      schemaVersion: ev.schemaVersion,
      payload: ev.payload
    });
    if (!validation.ok) {
      this.logger.warn({ id: ev.id, type: ev.type, errors: validation.errors }, 'logging publisher validation failed');
      return { ok: false, error: new Error('schema_validation_failed') };
    }
    this.logger.debug({
      evt: ev.type,
      aggregateId: ev.aggregateId,
      id: ev.id,
      schemaVersion: ev.schemaVersion,
      eventVersion: ev.eventVersion,
      tenantId: ev.tenantId,
      correlationId: ev.correlationId,
      partitionKey: ev.partitionKey
    }, 'logging publisher emit');
    return { ok: true };
  }
  async health() { return { ok: true }; }
  async shutdown() { /* noop */ }
}
