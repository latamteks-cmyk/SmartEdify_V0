import type { Channel, Connection } from 'amqplib';
import { loadAmqpModule } from '../messaging/amqp-loader.js';
import { ensureRabbitMqTopology } from '../messaging/rabbitmq-topology.js';
import { Consumer } from './consumer.js';
import { brokerDeadLetterMessagesGauge } from '../../metrics/registry.js';

export interface RabbitMqDeadLetterConsumerOptions {
  url: string;
  exchange: string;
  routingKey: string;
  queue: string;
  deadLetterExchange: string;
  deadLetterQueue: string;
  deadLetterRoutingKey?: string;
  checkIntervalMs: number;
  alertThreshold?: number;
  logger?: any;
}

export class RabbitMqDeadLetterConsumer implements Consumer {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private timer: NodeJS.Timeout | null = null;
  private started = false;
  private shuttingDown = false;
  private lastAlertCount = 0;

  constructor(private opts: RabbitMqDeadLetterConsumerOptions) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    try {
      const amqp = await loadAmqpModule();
      this.connection = await amqp.connect(this.opts.url);
      this.connection.on('error', err => {
        this.opts.logger?.error({ err }, 'rabbitmq dead-letter connection error');
      });
      this.connection.on('close', () => {
        this.opts.logger?.warn('rabbitmq dead-letter connection closed');
        this.channel = null;
        brokerDeadLetterMessagesGauge.set(0);
      });
      this.channel = await this.connection.createChannel();
      await ensureRabbitMqTopology(this.channel, {
        exchange: this.opts.exchange,
        routingKey: this.opts.routingKey,
        queue: this.opts.queue,
        deadLetterExchange: this.opts.deadLetterExchange,
        deadLetterQueue: this.opts.deadLetterQueue,
        deadLetterRoutingKey: this.opts.deadLetterRoutingKey
      }, this.opts.logger);
      await this.pollOnce();
      this.timer = setInterval(() => {
        this.pollOnce().catch(err => {
          this.opts.logger?.error({ err }, 'rabbitmq dead-letter monitor error');
        });
      }, this.opts.checkIntervalMs);
    } catch (err) {
      this.started = false;
      brokerDeadLetterMessagesGauge.set(0);
      this.opts.logger?.error({ err }, 'rabbitmq dead-letter consumer start failed');
      await this.shutdown().catch(() => {});
      throw err;
    }
  }

  private async pollOnce(): Promise<void> {
    if (!this.channel) return;
    const info = await this.channel.checkQueue(this.opts.deadLetterQueue);
    const count = info?.messageCount ?? 0;
    brokerDeadLetterMessagesGauge.set(count);
    const threshold = this.opts.alertThreshold ?? 1;
    if (count >= threshold && count !== this.lastAlertCount) {
      this.opts.logger?.warn({ queue: this.opts.deadLetterQueue, count }, 'messages accumulated in dead-letter queue');
      this.lastAlertCount = count;
    }
  }

  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.channel) {
      try { await this.channel.close(); } catch { /* ignore */ }
      this.channel = null;
    }
    if (this.connection) {
      try { await this.connection.close(); } catch { /* ignore */ }
      this.connection = null;
    }
    this.started = false;
    this.shuttingDown = false;
  }
}
