import { ensureRabbitMqTopology } from '../messaging/rabbitmq-topology.js';
import { loadAmqpModule } from '../messaging/amqp-loader.js';
import type { Connection, ConfirmChannel } from 'amqplib';
import type { OutboxEnvelope } from './publisher.js';
import { Publisher, PublisherResult } from './publisher.js';
import { brokerPayloadBytesTotal, brokerPublishLatency, brokerPublisherConnectFailTotal, brokerPublisherHealthGauge } from '../../metrics/registry.js';

export interface RabbitMqPublisherOptions {
  url: string;
  exchange: string;
  routingKey: string;
  queue: string;
  deadLetterExchange: string;
  deadLetterQueue: string;
  deadLetterRoutingKey?: string;
  logger?: any;
}

export class RabbitMqPublisher implements Publisher {
  private connection: Connection | null = null;
  private channel: ConfirmChannel | null = null;
  private connecting: Promise<void> | null = null;
  private shuttingDown = false;

  constructor(private opts: RabbitMqPublisherOptions) {
    brokerPublisherHealthGauge.set(0);
  }

  private async ensureConnection() {
    if (this.channel || this.shuttingDown) return;
    if (this.connecting) {
      await this.connecting;
      return;
    }
    this.connecting = (async () => {
      const amqp = await loadAmqpModule();
      try {
        this.connection = await amqp.connect(this.opts.url);
        this.connection.on('close', () => {
          this.channel = null;
          this.connection = null;
          brokerPublisherHealthGauge.set(0);
        });
        this.connection.on('error', (err: any) => {
          this.opts.logger?.error({ err }, 'rabbitmq connection error');
        });
        this.channel = await this.connection.createConfirmChannel();
        await ensureRabbitMqTopology(this.channel, {
          exchange: this.opts.exchange,
          routingKey: this.opts.routingKey,
          queue: this.opts.queue,
          deadLetterExchange: this.opts.deadLetterExchange,
          deadLetterQueue: this.opts.deadLetterQueue,
          deadLetterRoutingKey: this.opts.deadLetterRoutingKey
        }, this.opts.logger);
        brokerPublisherHealthGauge.set(1);
      } catch (err) {
        brokerPublisherHealthGauge.set(0);
        brokerPublisherConnectFailTotal.inc();
        this.opts.logger?.error({ err }, 'rabbitmq publisher connection failed');
        await this.teardown();
        throw err;
      }
    })();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async teardown() {
    if (this.channel) {
      try { await this.channel.close(); } catch { /* ignore */ }
      this.channel = null;
    }
    if (this.connection) {
      try { await this.connection.close(); } catch { /* ignore */ }
      this.connection = null;
    }
    brokerPublisherHealthGauge.set(0);
  }

  async publish(ev: OutboxEnvelope): Promise<PublisherResult> {
    if (this.shuttingDown) {
      return { ok: false, error: new Error('publisher is shutting down') };
    }
    try {
      await this.ensureConnection();
    } catch (err) {
      return { ok: false, error: err };
    }
    if (!this.channel) {
      return { ok: false, error: new Error('rabbitmq channel unavailable') };
    }
    const payload = Buffer.from(JSON.stringify(ev));
    const start = process.hrtime.bigint();
    try {
      const published = this.channel.publish(this.opts.exchange, this.opts.routingKey, payload, {
        persistent: true,
        contentType: 'application/json',
        headers: {
          'x-event-type': ev.type,
          'x-event-id': ev.id,
          'x-aggregate-id': ev.aggregateId
        }
      });
      if (!published) {
        await new Promise(resolve => this.channel?.once('drain', resolve));
      }
      await this.channel.waitForConfirms();
      const end = process.hrtime.bigint();
      const seconds = Number(end - start) / 1e9;
      brokerPublishLatency.observe(seconds);
      brokerPayloadBytesTotal.inc(payload.length);
      return { ok: true };
    } catch (err) {
      this.opts.logger?.error({ err }, 'rabbitmq publish failed');
      brokerPublisherHealthGauge.set(0);
      await this.teardown();
      return { ok: false, error: err };
    }
  }

  async health(): Promise<{ ok: boolean; details?: any }> {
    const ok = !!this.connection && !!this.channel;
    return { ok, details: { queue: this.opts.queue, exchange: this.opts.exchange } };
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    await this.teardown();
  }
}
