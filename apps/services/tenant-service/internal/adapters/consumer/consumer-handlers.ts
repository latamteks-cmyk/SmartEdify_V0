import { Envelope } from '../../domain/envelope.js';

export interface HandlerContext {
  logger: any;
  traceId?: string;
  tenantId?: string;
  eventId: string;
  rawEnvelope: Envelope;
}

export type Handler = (
  payload: any,
  meta: { eventType: string; eventVersion?: number },
  ctx: HandlerContext
) => Promise<void>;

const registry = new Map<string, Handler>();

export function registerHandler(eventType: string, handler: Handler) {
  if (!eventType || typeof eventType !== 'string') {
    throw new Error('handler register: eventType inválido');
  }
  if (registry.has(eventType)) {
    throw new Error(`handler register: duplicado para eventType=${eventType}`);
  }
  registry.set(eventType, handler);
}

export function getHandler(eventType: string): Handler | undefined {
  return registry.get(eventType);
}

export function listHandlers(): string[] {
  return Array.from(registry.keys());
}

// Utilidad opcional para validación eager en arranque
export function assertHandlersPresent(required: string[]) {
  const missing = required.filter(r => !registry.has(r));
  if (missing.length) {
    throw new Error(`Faltan handlers para eventTypes: ${missing.join(', ')}`);
  }
}
