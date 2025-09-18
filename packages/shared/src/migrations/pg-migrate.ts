// Importación laxa para evitar problemas de tipos en distintos modos (ESM/CJS)
// y no forzar a consumidores a tener tipos de node-pg-migrate en tiempo de test
// eslint-disable-next-line @typescript-eslint/no-var-requires
const migrate = require('node-pg-migrate');

export interface MigrationLogger {
  readonly info?: (message: string) => void;
  readonly error?: (message: string, error: unknown) => void;
}

export interface MigrationOptions {
  readonly direction?: 'up' | 'down';
  readonly logger?: MigrationLogger;
  // Opciones mínimas esperadas por node-pg-migrate
  readonly databaseUrl?: string | { connectionString: string };
  readonly dir?: string | string[];
  readonly migrationsTable?: string;
  readonly schema?: string;
  // Permitir opciones adicionales sin tipar estrictamente
  readonly [key: string]: unknown;
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
