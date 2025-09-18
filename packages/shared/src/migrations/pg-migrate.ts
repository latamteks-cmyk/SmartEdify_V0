import type { RunnerOption } from 'node-pg-migrate';
import migrate from 'node-pg-migrate';

export interface MigrationLogger {
  readonly info?: (message: string) => void;
  readonly error?: (message: string, error: unknown) => void;
}

export interface MigrationOptions extends RunnerOption {
  readonly direction?: 'up' | 'down';
  readonly logger?: MigrationLogger;
}

export async function runMigrations({
  direction = 'up',
  logger,
  ...options
}: MigrationOptions): Promise<void> {
  try {
    await migrate({ direction, ...options });
    logger?.info?.(`Migrations executed (${direction}).`);
  } catch (error) {
    logger?.error?.('Migration execution failed.', error);
    throw error;
  }
}

export function createMigrator(baseOptions: MigrationOptions): {
  readonly up: (options?: Partial<MigrationOptions>) => Promise<void>;
  readonly down: (options?: Partial<MigrationOptions>) => Promise<void>;
  readonly run: (options?: Partial<MigrationOptions>) => Promise<void>;
} {
  const run = (options?: Partial<MigrationOptions>) =>
    runMigrations({ ...baseOptions, ...options, direction: options?.direction ?? baseOptions.direction });

  const up = (options?: Partial<MigrationOptions>) => run({ ...options, direction: 'up' });
  const down = (options?: Partial<MigrationOptions>) => run({ ...options, direction: 'down' });

  return {
    up,
    down,
    run
  };
}
