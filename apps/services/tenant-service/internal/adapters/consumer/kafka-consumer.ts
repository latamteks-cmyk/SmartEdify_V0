// @ts-ignore tipos de kafkajs pueden no resolverse en entorno parcial
import { Kafka, logLevel } from 'kafkajs';
import { Consumer } from './consumer.js';
import { brokerConsumerLagGauge, brokerConsumerLagMaxGauge, brokerConsumerLagPollFailedTotal } from '../../metrics/registry.js';

export interface KafkaConsumerOptions {
  brokers: string[];
  clientId: string;
  groupId: string;
  topicPrefix: string;
  lagIntervalMs: number;
  logger?: any;
}

export class KafkaLagConsumer implements Consumer {
  private kafka: Kafka;
  private admin: ReturnType<Kafka['admin']>;
  private timer: any;
  private started = false;
  constructor(private opts: KafkaConsumerOptions) {
    this.kafka = new Kafka({ clientId: opts.clientId, brokers: opts.brokers, logLevel: logLevel.NOTHING });
    this.admin = this.kafka.admin();
  }

  async start(): Promise<void> {
    if (this.started) return;
    try {
      await this.admin.connect();
      this.started = true;
      this.schedule();
    } catch (e) {
      brokerConsumerLagPollFailedTotal.inc();
      this.opts.logger?.warn({ err: e }, 'kafka lag consumer start failed');
    }
  }

  private schedule() {
    this.timer = setTimeout(() => this.pollLag().catch(err => {
      brokerConsumerLagPollFailedTotal.inc();
      this.opts.logger?.error({ err }, 'lag poll failed');
    }).finally(() => this.schedule()), this.opts.lagIntervalMs);
  }

  private async pollLag() {
    if (!this.started) return;
    const topics = await this.admin.listTopics();
  const targetTopics = (topics as string[]).filter((t: string) => t.startsWith(this.opts.topicPrefix + '.'));
    let maxLag = 0;
    for (const topic of targetTopics) {
      const endOffsets = await this.admin.fetchTopicOffsets(topic);
      // Tipos modernos requieren arreglo topics
      const groupOffsets = await this.admin.fetchOffsets({ groupId: this.opts.groupId, topics: [topic] });
      const groupOffsetsArr = Array.isArray(groupOffsets) ? groupOffsets : (groupOffsets as any)?.[topic] || [];
      for (const part of endOffsets as any[]) {
        const partition = part.partition;
        const logEnd = parseInt(part.offset, 10);
        const committedInfo = (groupOffsetsArr as any[]).find((g: any) => g.partition === partition);
        const committed = committedInfo && committedInfo.offset !== '-1' ? parseInt(committedInfo.offset, 10) : 0;
        const lag = Math.max(0, logEnd - committed);
        brokerConsumerLagGauge.set({ topic, partition: String(partition) }, lag);
        if (lag > maxLag) maxLag = lag;
      }
    }
    brokerConsumerLagMaxGauge.set(maxLag);
  }

  async shutdown(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    if (this.started) {
      await this.admin.disconnect().catch(() => {});
      this.started = false;
    }
  }
}
