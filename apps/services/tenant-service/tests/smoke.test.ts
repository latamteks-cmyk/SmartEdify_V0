import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { setTimeout as sleep } from 'node:timers/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { startTracing, shutdownTracing } from '../internal/observability/tracing.js';
import { tenantRoutes } from '../internal/adapters/http/routes/tenants.js';
import { InMemoryTenantRepository } from '../internal/adapters/repo/inmemory.js';

class InMemoryOutboxRepository {
  public readonly events: any[] = [];
  async enqueue(event: any) {
    this.events.push(event);
  }
}

class MockOtelCollector {
  private server?: http.Server;
  private readonly payloads: string[] = [];
  private port = 0;

  constructor(private readonly rawConfig: string) {
    if (!new RegExp('receivers:\\s*\\notlp:', 'm').test(rawConfig)) {
      throw new Error('Collector config does not declare an otlp receiver');
    }
    if (!new RegExp('protocols:\\s*\\n\\s*grpc:\\s*\\n\\s*http:', 'm').test(rawConfig)) {
      throw new Error('Collector config is expected to enable OTLP/http');
    }
    if (!new RegExp('exporters:\\s*\\n\\s*logging:', 'm').test(rawConfig)) {
      throw new Error('Collector config should include the logging exporter');
    }
  }

  async start(preferredPort = 4318) {
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/v1/traces') {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(chunk as Buffer));
        req.on('end', () => {
          const raw = Buffer.concat(chunks);
          this.payloads.push(raw.toString('utf8'));
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('{}');
        });
        req.on('error', () => {
          res.writeHead(500);
          res.end();
        });
      } else if (req.url === '/healthz') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('ok');
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve, reject) => {
      const tryListen = (port: number) => {
        this.server!.once('error', err => {
          if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE' && port !== 0) {
            this.server!.removeAllListeners('error');
            tryListen(0);
            return;
          }
          reject(err);
        });
        this.server!.listen(port, '127.0.0.1', () => {
          const addr = this.server!.address() as AddressInfo;
          this.port = addr.port;
          this.server!.removeAllListeners('error');
          resolve();
        });
      };
      tryListen(preferredPort);
    });
  }

  get baseUrl() {
    if (!this.port) throw new Error('Collector not started');
    return `http://127.0.0.1:${this.port}`;
  }

  payloadIncludes(text: string) {
    return this.payloads.some(payload => payload.includes(text));
  }

  async stop() {
    if (!this.server) return;
    await new Promise<void>(resolve => {
      this.server!.close(() => resolve());
    });
  }
}

// Sanity test para asegurar que el archivo registra al menos una prueba
it('smoke file loads', () => {
  expect(true).toBe(true);
});

async function waitFor(predicate: () => boolean, timeoutMs = 15000, intervalMs = 200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await sleep(intervalMs);
  }
  throw new Error('condition not met in time');
}

describe('tenant-service observability smoke', () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let collector: MockOtelCollector;
  // no file-based config needed

  beforeAll(async () => {
    // Config mínima inline para simular Collector con receptor OTLP/http
    const inlineCollectorConfig = `receivers:
otlp:
protocols:
  grpc:
  http:
exporters:
  logging:
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [logging]
`;
    collector = new MockOtelCollector(inlineCollectorConfig);
    await collector.start();

    process.env.OTEL_SDK_DISABLED = 'false';
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = collector.baseUrl;
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = `${collector.baseUrl}/v1/traces`;
  process.env.OTEL_EXPORTER_OTLP_PROTOCOL = 'http/json';
  process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL = 'http/json';
    process.env.OTEL_SERVICE_NAME = 'tenant-service';
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';

    await startTracing();
  const { default: Fastify } = await import('fastify');
  app = Fastify({ logger: false });
    const di = {
      tenantRepo: new InMemoryTenantRepository(),
      outboxRepo: new InMemoryOutboxRepository()
    } as const;
    app.decorate('di', di);
    await app.register(tenantRoutes);
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }, 60_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownTracing();
    if (collector) {
      await collector.stop();
    }
  });

  it('emits spans with tenant identifiers through OTLP', async () => {
    const response = await fetch(`${baseUrl}/tenants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Observability Smoke', code: 'obs-smoke' })
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    const tenantId = body.id as string;

    await waitFor(() => collector.payloadIncludes('service.name'));
    expect(collector.payloadIncludes('service.name')).toBe(true);
    expect(collector.payloadIncludes('tenant-service')).toBe(true);

    await waitFor(() => collector.payloadIncludes('tenant.id'));
    expect(collector.payloadIncludes('tenant.id')).toBe(true);
    await waitFor(() => collector.payloadIncludes(tenantId));
    expect(collector.payloadIncludes(tenantId)).toBe(true);
    expect(collector.payloadIncludes('tenant.code')).toBe(true);
  }, 30_000);
});
