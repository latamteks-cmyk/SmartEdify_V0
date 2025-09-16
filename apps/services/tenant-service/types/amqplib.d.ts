declare module 'amqplib' {
  export interface Replies {
    assertQueue: { queue: string; messageCount: number; consumerCount: number };
  }

  export interface Channel {
    assertQueue(queue: string, options?: any): Promise<Replies['assertQueue']>;
    assertExchange(exchange: string, type: string, options?: any): Promise<any>;
    bindQueue(queue: string, exchange: string, pattern: string, args?: any): Promise<void>;
    publish(exchange: string, routingKey: string, content: Buffer, options?: any): boolean;
    waitForConfirms(): Promise<void>;
    close(): Promise<void>;
    checkQueue(queue: string): Promise<Replies['assertQueue']>;
    prefetch(count: number): Promise<void>;
  }

  export interface ConfirmChannel extends Channel {}

  export interface Connection {
    createChannel(): Promise<Channel>;
    createConfirmChannel(): Promise<ConfirmChannel>;
    close(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export function connect(url: string): Promise<Connection>;
}
