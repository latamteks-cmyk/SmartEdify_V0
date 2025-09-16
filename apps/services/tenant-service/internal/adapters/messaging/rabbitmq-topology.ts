import type { Channel } from 'amqplib';

export interface RabbitMqTopologyOptions {
  exchange: string;
  routingKey: string;
  queue: string;
  deadLetterExchange: string;
  deadLetterQueue: string;
  deadLetterRoutingKey?: string;
}

export async function ensureRabbitMqTopology(channel: Channel, opts: RabbitMqTopologyOptions, logger?: any): Promise<void> {
  const {
    exchange,
    routingKey,
    queue,
    deadLetterExchange,
    deadLetterQueue,
    deadLetterRoutingKey
  } = opts;

  await channel.assertExchange(deadLetterExchange, 'topic', { durable: true });
  await channel.assertQueue(deadLetterQueue, { durable: true });
  const bindingKey = deadLetterRoutingKey ?? routingKey ?? '';
  await channel.bindQueue(deadLetterQueue, deadLetterExchange, bindingKey);

  await channel.assertExchange(exchange, 'topic', { durable: true });
  const args: Record<string, any> = { 'x-dead-letter-exchange': deadLetterExchange };
  if (deadLetterRoutingKey) {
    args['x-dead-letter-routing-key'] = deadLetterRoutingKey;
  }
  await channel.assertQueue(queue, {
    durable: true,
    arguments: args
  });
  await channel.bindQueue(queue, exchange, routingKey);
  logger?.debug?.({ exchange, queue, deadLetterExchange, deadLetterQueue }, 'rabbitmq topology ensured');
}
