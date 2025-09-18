declare module 'zod' {
  export interface ZodIssue {
    readonly path: readonly (string | number)[];
    readonly message: string;
    readonly code?: string;
  }

  export interface ZodError<T = unknown> {
    readonly issues: readonly ZodIssue[];
  }

  export interface SafeParseSuccess<T> {
    success: true;
    data: T;
  }

  export interface SafeParseFailure {
    success: false;
    error: ZodError;
  }

  export interface ZodTypeAny<TOutput = unknown> {
    safeParse(data: unknown): SafeParseSuccess<TOutput> | SafeParseFailure;
  }

  export function coerce<T>(value: unknown): T;

  export type infer<T extends ZodTypeAny> = T extends ZodTypeAny<infer R> ? R : never;
}

declare module '@opentelemetry/api' {
  export enum DiagLogLevel {
    ALL,
    VERBOSE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
    NONE
  }

  export interface DiagLogger {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  }

  export const diag: {
    setLogger(logger: DiagLogger, level?: DiagLogLevel): void;
  };
}

declare module '@opentelemetry/resources' {
  export class Resource {
    constructor(attributes: Record<string, unknown>);
    static default(): Resource;
    attributes: Record<string, unknown>;
    merge(other: Resource): Resource;
  }
}

declare module '@opentelemetry/sdk-trace-base' {
  export interface SpanExporter {
    export(): void;
  }

  export interface Sampler {
    shouldSample(...args: unknown[]): unknown;
  }

  export class BatchSpanProcessor {
    constructor(exporter: SpanExporter);
  }
}

declare module '@opentelemetry/sdk-trace-node' {
  import type { Sampler } from '@opentelemetry/sdk-trace-base';
  import type { Resource } from '@opentelemetry/resources';

  export class NodeTracerProvider {
    constructor(options?: { resource?: Resource; sampler?: Sampler });
    addSpanProcessor(processor: unknown): void;
    register(): void;
    shutdown(): Promise<void>;
  }
}

declare module '@opentelemetry/semantic-conventions' {
  export const SemanticResourceAttributes: Record<string, string>;
}

declare module 'prom-client' {
  export class Registry {
    constructor();
    metrics(): Promise<string>;
    resetMetrics(): void;
  }

  export interface DefaultMetricsCollectorConfiguration {
    prefix?: string;
    register?: Registry;
    timeout?: number;
  }

  export function collectDefaultMetrics(configuration?: DefaultMetricsCollectorConfiguration): void;
}

declare module 'node-pg-migrate' {
  export interface RunnerOption {
    readonly databaseUrl?: string;
    readonly dir?: string | readonly string[];
    readonly migrationsTable?: string;
    readonly direction?: 'up' | 'down';
    readonly count?: number;
  }

  export default function migrate(options: RunnerOption): Promise<void>;
}

declare const process: {
  env: Record<string, string | undefined>;
};
