// Envelope domain type compartido entre publisher y consumer.
// Extraído desde publisher.ts para evitar dependencias cruzadas.
export interface Envelope {
  id: string;
  aggregateType: string;
  aggregateId: string;
  type: string;
  payload: any;
  createdAt: Date;
  occurredAt: Date;
  schemaVersion: number;
  eventVersion: number;
  tenantId?: string;
  correlationId?: string;
  partitionKey?: string;
  headers?: Record<string, string>;
  traceId?: string;
  spanId?: string;
}

// Alias de compatibilidad (publisher usaba OutboxEnvelope)
export type OutboxEnvelope = Envelope;
