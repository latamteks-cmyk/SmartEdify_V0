// Lazy-load de kafkajs para permitir pruebas sin la dependencia instalada
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let KafkaLib: any; // clase Kafka
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kafkaLogLevel: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('kafkajs');
  KafkaLib = mod.Kafka;
  kafkaLogLevel = mod.logLevel;
} catch {
  KafkaLib = class { constructor(_: any) {} consumer() { return { connect: async()=>{}, subscribe: async()=>{}, run: async()=>{}, disconnect: async()=>{} }; } };
  kafkaLogLevel = { NOTHING: 0 };
}
import { Consumer as BaseConsumer } from './consumer.js';
import { getHandler } from './consumer-handlers.js';
import { Envelope } from '../../domain/envelope.js';
import { consumerEventsProcessedTotal, consumerRetryAttemptsTotal, consumerProcessDuration, consumerInflightGauge, consumerHandlerNotFoundTotal } from '../../metrics/registry.js';

export interface KafkaProcessingConsumerOptions {
  brokers: string[];
  clientId: string;
  groupId: string;
  topic: string; // único tópico principal por ahora
  fromBeginning?: boolean;
  logger?: any;
  maxConcurrency: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
}

interface PartitionOffsetTracker {
  // offsets procesados pero no comprometidos (exitosos)
  processed: Set<number>;
  // menor offset pendiente de commit (candidato)
  lowestUncommitted: number;
}

export class KafkaProcessingConsumer implements BaseConsumer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kafka: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private consumer: any;
  private started = false;
  private shuttingDown = false;
  private inflight = 0;
  private partitionTrackers = new Map<number, PartitionOffsetTracker>();
  constructor(private opts: KafkaProcessingConsumerOptions) {
  this.kafka = new KafkaLib({ clientId: opts.clientId, brokers: opts.brokers, logLevel: kafkaLogLevel.NOTHING });
    this.consumer = this.kafka.consumer({ groupId: opts.groupId, allowAutoTopicCreation: false });
  }

  async start(): Promise<void> {
    if (this.started) return;
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: this.opts.topic, fromBeginning: !!this.opts.fromBeginning });
      this.started = true;
      await this.runLoop();
    } catch (e) {
      this.opts.logger?.error({ err: e }, 'kafka processing consumer start failed');
    }
  }

  private async runLoop() {
    await this.consumer.run({
      // usamos eachBatch para tener control manual de offsets
      // Tipado laxo: kafkajs puede no estar disponible en compilación de test -> usamos any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary, isRunning }: any) => {
        if (!isRunning() || this.shuttingDown) return;
        for (const message of batch.messages) {
          if (!isRunning() || this.shuttingDown) break;
          // Control de concurrencia simple: si inflight >= max, esperar
            while (this.inflight >= this.opts.maxConcurrency && isRunning() && !this.shuttingDown) {
              await new Promise(r => setTimeout(r, 10));
              await heartbeat();
            }
          this.processMessage(batch.topic, batch.partition, message.offset, message.value)
            .then(() => {
              resolveOffset(message.offset);
              this.markProcessed(batch.partition, Number(message.offset));
            })
            .catch(err => {
              // Por ahora sólo log y no resolvemos offset => reentrega futura
              this.opts.logger?.error({ err }, 'handler failed');
            })
            .finally(() => { this.inflight--; consumerInflightGauge.set(this.inflight); });
          this.inflight++;
          consumerInflightGauge.set(this.inflight);
          await heartbeat();
        }
        // Esperar a que terminen los inflight antes de commit parcial
        const spinStart = Date.now();
        while (this.inflight > 0 && (Date.now() - spinStart) < 30000) {
          await new Promise(r => setTimeout(r, 20));
          await heartbeat();
        }
        await commitOffsetsIfNecessary();
      }
    });
  }

  // Expuesta públicamente solo para facilitar pruebas de lógica interna (no llamar fuera de tests)
  async processMessage(topic: string, partition: number, offset: string, value?: Buffer) {
    if (!value) return; // vacío => ignorar
    let env: Envelope | undefined;
    try {
      env = JSON.parse(value.toString());
    } catch (e) {
      this.opts.logger?.warn({ err: e, offset }, 'invalid json');
      return; // se reintentará pero seguirá fallando, mejora futura: filtrar permanente
    }
    if (!env || typeof env !== 'object') return;
    const eventType = (env as any).type;
    const handler = getHandler(eventType);
    if (!handler) {
      this.opts.logger?.warn({ eventType }, 'no handler for event');
      consumerHandlerNotFoundTotal.inc({ type: eventType || 'unknown' });
      return; // reentrega futura
    }
    const endTimer = consumerProcessDuration.startTimer({ type: eventType });
    try {
      await this.executeWithRetry(async () => {
        await handler((env as any).payload, { eventType, eventVersion: (env as any).eventVersion }, {
          logger: this.opts.logger,
          traceId: (env as any).traceId,
          tenantId: (env as any).tenantId,
          eventId: (env as any).id,
          rawEnvelope: env as Envelope
        });
      }, eventType, Number(offset));
      consumerEventsProcessedTotal.inc({ status: 'success', type: eventType });
    } catch (err) {
      consumerEventsProcessedTotal.inc({ status: 'error', type: eventType });
      throw err;
    } finally {
      endTimer();
    }
  }

  private async executeWithRetry(fn: () => Promise<void>, eventType: string, offset: number) {
    let attempt = 0;
    // bucle de reintento in-memory
    while (true) {
      try {
        await fn();
        return; // éxito
      } catch (err: any) {
        attempt++;
        const classification = this.classifyError(err);
        if (classification === 'permanent') {
            this.opts.logger?.error({ err, eventType, attempt }, 'permanent handler error');
            throw err; // no offset resolve => reentrega (futuro: DLQ)
        }
        if (attempt > this.opts.maxRetries) {
          this.opts.logger?.error({ err, eventType, attempt }, 'max retries exceeded');
          throw err;
        }
        const delay = this.computeBackoff(attempt);
        this.opts.logger?.warn({ eventType, attempt, delay }, 'transient handler error - retrying');
        consumerRetryAttemptsTotal.inc({ type: eventType });
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  private classifyError(err: any): 'transient' | 'permanent' {
    if (!err) return 'permanent';
    const msg = (err.message || '').toLowerCase();
    // heurística simple: timeouts, network, rate limit => transitorio
    if (/(timeout|temporar|network|again|econn|etimedout|eai_again|rate)/.test(msg)) return 'transient';
    return 'permanent';
  }

  private computeBackoff(attempt: number): number {
    const base = this.opts.retryBaseDelayMs;
    const max = this.opts.retryMaxDelayMs;
    const exp = Math.min(max, base * Math.pow(2, attempt - 1));
    const jitter = Math.floor(Math.random() * base);
    return Math.min(max, exp + jitter);
  }

  private markProcessed(partition: number, offset: number) {
    let tracker = this.partitionTrackers.get(partition);
    if (!tracker) {
      tracker = { processed: new Set<number>(), lowestUncommitted: 0 };
      this.partitionTrackers.set(partition, tracker);
    }
    tracker.processed.add(offset);
    // avanzar lowestUncommitted si es contiguous
    while (tracker.processed.has(tracker.lowestUncommitted)) {
      tracker.processed.delete(tracker.lowestUncommitted);
      tracker.lowestUncommitted++;
    }
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    try {
      // Esperar a que finalicen inflight razonablemente
      const start = Date.now();
      while (this.inflight > 0 && (Date.now() - start) < 10000) {
        await new Promise(r => setTimeout(r, 50));
      }
      if (this.started) {
        await this.consumer.disconnect();
      }
    } catch (e) {
      this.opts.logger?.error({ err: e }, 'error on shutdown consumer');
    } finally {
      this.started = false;
    }
  }
}
