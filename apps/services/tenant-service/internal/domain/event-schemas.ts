import { z } from 'zod';

/*
  Definición de esquemas de payload por tipo de evento y función de validación general.
  Mantener versión de schema (`schemaVersion`) y `eventVersion` en los envelopes para evolución.
*/

export interface SchemaValidationIssue {
  path: string;
  message: string;
}

export interface SchemaValidationResult {
  ok: boolean;
  errors?: SchemaValidationIssue[];
}

// Ejemplos iniciales
const tenantCreatedV1 = z.object({
  name: z.string().min(1).max(200),
  ownerUserId: z.string().uuid(),
  plan: z.string().min(1).max(50)
});

const unitCreatedV1 = z.object({
  tenantId: z.string().uuid(),
  code: z.string().min(1).max(50),
  label: z.string().min(1).max(200)
});

// Registro de esquemas por (eventType,eventVersion)
const schemas: Record<string, z.ZodTypeAny> = {
  'tenant.created@1': tenantCreatedV1,
  'unit.created@1': unitCreatedV1
};

export interface EventEnvelopeLike {
  type: string;
  eventVersion: number;
  schemaVersion: number; // por ahora se alinea con eventVersion == 1 (evolucionar si cambia estructura del envelope)
  payload: unknown;
}

export function validateEvent(envelope: EventEnvelopeLike): SchemaValidationResult {
  const key = `${envelope.type}@${envelope.eventVersion}`;
  const schema = schemas[key];
  if (!schema) {
    return { ok: false, errors: [{ path: 'type', message: `No schema registered for ${key}` }] };
  }
  const parsed = schema.safeParse(envelope.payload);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(i => ({ path: i.path.join('.') || '(root)', message: i.message }))
    };
  }
  return { ok: true };
}

export function listRegisteredSchemas(): string[] {
  return Object.keys(schemas);
}
