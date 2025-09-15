export interface Consumer {
  start(): Promise<void>;
  shutdown(): Promise<void>;
}

export class LoggingConsumer implements Consumer {
  async start() { /* noop */ }
  async shutdown() { /* noop */ }
}
