import { z } from 'zod';
import { OutboxEnvelope } from '../../domain/envelope.js';

export interface EnvelopeValidationConfig {
  maxPayloadBytes: number;
}

export interface EnvelopeValidationResult {
  ok: boolean;
  errors?: { reason: string; detail?: string }[];
}

// Esquema base (sin validar tamaño todavía)
const envelopeSchema = z.object({
  id: z.string().uuid(),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  type: z.string().min(1),
  payload: z.any(),
  createdAt: z.date(),
  occurredAt: z.date(),
  schemaVersion: z.number().int().gte(1),
  eventVersion: z.number().int().gte(1),
  tenantId: z.string().optional(),
  correlationId: z.string().optional(),
  partitionKey: z.string().optional(),
  headers: z.record(z.string()).optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional()
});

export function validateEnvelope(env: OutboxEnvelope, cfg: EnvelopeValidationConfig): EnvelopeValidationResult {
  const issues: { reason: string; detail?: string }[] = [];
  const parsed = envelopeSchema.safeParse(env);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({ reason: 'schema', detail: `${issue.path.join('.')}: ${issue.message}` });
    }
  }
  // Tamaño serializado
  try {
    const json = JSON.stringify(env.payload);
    if (json && json.length > cfg.maxPayloadBytes) {
      issues.push({ reason: 'payload_size', detail: `payload bytes=${json.length} > max=${cfg.maxPayloadBytes}` });
    }
  } catch (e:any) {
    issues.push({ reason: 'payload_serialize', detail: e?.message || 'serialize error' });
  }
  if (issues.length) return { ok: false, errors: issues };
  return { ok: true };
}
