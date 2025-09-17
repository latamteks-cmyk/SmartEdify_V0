import { PgOutboxRepository } from '../repo/outbox-pg.js';
import { outboxPendingGauge, outboxPublishFailedTotal, outboxPublishedTotal, outboxPublishAttemptsTotal, outboxRetryTotal, outboxFailedPermanentTotal, outboxPublishLatency, outboxDlqSizeGauge, outboxEventAge, brokerPublishTotal, brokerPublishFailedTotal, outboxValidationFailedTotal } from '../../metrics/registry.js';
import { Publisher } from './publisher.js';
import { validateEnvelope } from './envelope-validation.js';
import { config } from '../../config/env.js';
import { trace, SpanStatusCode, context, TraceFlags, SpanContext, Context } from '@opentelemetry/api';

export interface OutboxPublisherOptions {
  intervalMs: number;
  batchSize: number;
  logger: any;
  maxRetries?: number; // default 10
  baseRetryDelayMs?: number; // default 500
}

export class OutboxPoller {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;
  constructor(private repo: PgOutboxRepository, private publisher: Publisher, private opts: OutboxPublisherOptions) {}

  start() { this.schedule(); }

  private computeDelay(): number {
    if (this.consecutiveErrors === 0) return this.opts.intervalMs;
    const maxFactor = 5; // limitar crecimiento
    const factor = Math.min(maxFactor, this.consecutiveErrors);
    const base = this.opts.intervalMs * Math.pow(2, factor - 1);
    const jitter = Math.random() * (this.opts.intervalMs / 2);
    return base + jitter;
  }

  private schedule() {
    const delay = this.computeDelay();
    this.timer = setTimeout(() => this.tick().catch(err => {
      this.consecutiveErrors++;
      this.opts.logger.error({ err, consecutiveErrors: this.consecutiveErrors }, 'outbox tick error');
    }).finally(() => this.schedule()), delay);
  }

  async tick() {
    const tracer = trace.getTracer('tenant-service');
    await tracer.startActiveSpan('outbox.tick', async span => {
      const batch = await this.repo.fetchBatch(this.opts.batchSize);
      span.setAttribute('outbox.batch.size', batch.length);
      // Actualizar gauges backlog + DLQ
      const [pendingCount, dlqCount] = await Promise.all([
        this.repo.countPending(),
        this.repo.countDLQ().catch(() => 0)
      ]);
      span.setAttribute('outbox.pending.before', pendingCount);
      span.setAttribute('outbox.dlq.size', dlqCount);
      outboxPendingGauge.set(pendingCount);
      outboxDlqSizeGauge.set(dlqCount);
      const nowObs = Date.now();
      for (const ev of batch) {
        const ageSec = (nowObs - ev.createdAt.getTime()) / 1000;
        outboxEventAge.observe(ageSec);
      }
      if (!batch.length) { this.consecutiveErrors = 0; span.setStatus({ code: SpanStatusCode.OK }); span.end(); return; }
      const maxRetries = this.opts.maxRetries ?? 10;
      const baseDelay = this.opts.baseRetryDelayMs ?? 500;
      const publishedIds: string[] = [];
      const now = Date.now();
      for (const ev of batch) {
        const remoteParent = createRemoteParentContext(ev);
        await tracer.startActiveSpan('outbox.publish', {
          attributes: {
            'event.id': ev.id,
            'event.type': ev.type,
            'event.aggregate_type': ev.aggregateType,
            'event.retry_count': ev.retryCount,
            'outbox.parent.trace_id': remoteParent?.spanContext.traceId || undefined,
            'outbox.parent.span_id': remoteParent?.spanContext.spanId || undefined
          },
          links: remoteParent ? [{ context: remoteParent.spanContext }] : undefined
        }, remoteParent?.ctx, async evSpan => {
          try {
            outboxPublishAttemptsTotal.inc();
            const envelope = {
              id: ev.id,
              aggregateType: ev.aggregateType,
              aggregateId: ev.aggregateId,
              type: ev.type,
              payload: ev.payload,
              createdAt: ev.createdAt,
              occurredAt: ev.createdAt,
              schemaVersion: 1,
              eventVersion: 1,
              tenantId: ev.aggregateType === 'tenant' ? ev.aggregateId : undefined,
              correlationId: undefined,
              partitionKey: ev.aggregateId,
              headers: undefined,
              traceId: ev.traceId || span.spanContext().traceId,
              spanId: ev.spanId || span.spanContext().spanId
            } as const;
            const validation = validateEnvelope(envelope, { maxPayloadBytes: config.outboxMaxPayloadBytes });
            if (!validation.ok) {
              const reasons = new Set(validation.errors?.map(e => e.reason));
              for (const r of reasons) { outboxValidationFailedTotal.inc({ reason: r }); }
              await this.repo.markFailedPermanent(ev.id, validation.errors?.map(e => `${e.reason}:${e.detail}`).join('; '));
              outboxFailedPermanentTotal.inc();
              this.opts.logger.warn({ id: ev.id, reasons: Array.from(reasons) }, 'outbox event validation failed -> DLQ');
              evSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'validation_failed' });
              evSpan.setAttribute('outbox.validation.failed', true);
              evSpan.end();
              return;
            }
            const result = await this.publisher.publish(envelope as any);
            if (!result.ok) { throw result.error || new Error('publisher_failed'); }
            brokerPublishTotal.inc();
            publishedIds.push(ev.id);
            evSpan.setStatus({ code: SpanStatusCode.OK });
            evSpan.end();
          } catch (e: any) {
            outboxPublishAttemptsTotal.inc();
            outboxPublishFailedTotal.inc();
            brokerPublishFailedTotal.inc();
            const nextRetry = ev.retryCount + 1;
            if (nextRetry > maxRetries) {
              await this.repo.markFailedPermanent(ev.id, e);
              outboxFailedPermanentTotal.inc();
              this.opts.logger.warn({ id: ev.id }, 'outbox event failed permanently');
              evSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'failed_permanent' });
            } else {
              const exp = Math.pow(2, nextRetry - 1);
              const jitter = Math.random() * (baseDelay / 2);
              const delayMs = exp * baseDelay + jitter;
              await this.repo.markFailedTemporary(ev.id, nextRetry, delayMs, e);
              outboxRetryTotal.inc();
              evSpan.setAttribute('outbox.retry.next_delay_ms', delayMs);
              evSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'retry_scheduled' });
            }
            evSpan.recordException(e);
            evSpan.end();
          }
        });
      }
      if (publishedIds.length) {
        try {
          await this.repo.markPublished(publishedIds);
          outboxPublishedTotal.inc(publishedIds.length);
          for (const ev of batch.filter(e => publishedIds.includes(e.id))) {
            const seconds = (now - ev.createdAt.getTime()) / 1000;
            outboxPublishLatency.observe(seconds);
          }
          const newPending = await this.repo.countPending();
          outboxPendingGauge.set(newPending);
          span.setAttribute('outbox.pending.after', newPending);
          this.consecutiveErrors = 0;
        } catch (e) {
          outboxPublishFailedTotal.inc(publishedIds.length);
          span.recordException(e as any);
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'mark_published_failed' });
          span.end();
          throw e;
        }
      }
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    });
  }

  async stop() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } }
}

interface TraceCarrier {
  traceId?: string | null;
  spanId?: string | null;
}

function createRemoteParentContext(ev: TraceCarrier): { spanContext: SpanContext; ctx: Context } | null {
  const traceId = typeof ev.traceId === 'string' && /^[0-9a-f]{32}$/i.test(ev.traceId)
    ? ev.traceId
    : null;
  if (!traceId) return null;
  const spanId = typeof ev.spanId === 'string' && /^[0-9a-f]{16}$/i.test(ev.spanId)
    ? ev.spanId
    : '0000000000000000';
  const spanContext: SpanContext = {
    traceId,
    spanId,
    traceFlags: TraceFlags.SAMPLED,
    isRemote: true
  };
  const ctx = trace.setSpan(context.active(), trace.wrapSpanContext(spanContext));
  return { spanContext, ctx };
}
