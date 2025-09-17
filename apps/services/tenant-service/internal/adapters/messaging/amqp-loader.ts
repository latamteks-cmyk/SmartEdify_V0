let amqpModulePromise: Promise<typeof import('amqplib')> | null = null;

export async function loadAmqpModule() {
  if (!amqpModulePromise) {
    amqpModulePromise = import('amqplib').catch(err => {
      amqpModulePromise = null;
      const error = new Error('amqplib module not found. Install it with "npm install amqplib".');
      (error as any).cause = err;
      throw error;
    });
  }
  return amqpModulePromise;
}
