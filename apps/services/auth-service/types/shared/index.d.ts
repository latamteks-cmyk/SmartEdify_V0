declare module '@smartedify/shared' {
  // Tipos lazos para build; las pruebas usan tipos reales vía tsconfig.test.json
  export function withSpan<T>(
    tracerName: string,
    spanName: string,
    attributes: Record<string, unknown> | undefined,
    fn: (span: any) => Promise<T> | T
  ): Promise<T>;

  export interface TracingInitializationResult {
    shutdown: () => Promise<void>;
  }
  export interface InitializeNodeTracingOptions {
    serviceName?: string;
    environment?: string;
    exporters?: any[];
  }
  export function initializeNodeTracing(options?: InitializeNodeTracingOptions): Promise<TracingInitializationResult>;
}

declare module '@smartedify/shared/env' {
  export class EnvValidationError extends Error {
    issues: any[];
    constructor(message: string, error: any);
  }
  export function parseEnv<T = any>(schema: any, options?: any): T;
}

declare module '@smartedify/shared/metrics' {
  export interface InitializeMetricsOptions {
    registry?: any;
    defaultMetrics?: boolean;
    prefix?: string;
  }
  export function initializePrometheusMetrics(opts?: InitializeMetricsOptions): { registry: any };
}
