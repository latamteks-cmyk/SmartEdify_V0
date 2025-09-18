import type { ZodError, ZodTypeAny, infer as zInfer } from 'zod';

// Extrae el tipo de salida de un esquema Zod de forma segura
type InferSchema<TSchema extends ZodTypeAny> = zInfer<TSchema>;

export interface ParseEnvOptions<TSchema extends ZodTypeAny> {
  readonly source?: Record<string, string | undefined>;
  readonly defaults?: Partial<InferSchema<TSchema>>;
  readonly onValidationError?: (error: EnvValidationError) => never | void;
  readonly coerce?: boolean;
}

export class EnvValidationError extends Error {
  public readonly issues: ZodError['issues'];

  constructor(message: string, error: ZodError) {
    super(message);
    this.name = 'EnvValidationError';
    this.issues = error.issues;
  }
}

export function parseEnv<TSchema extends ZodTypeAny>(
  schema: TSchema,
  { source = process.env, defaults, onValidationError, coerce = true }: ParseEnvOptions<TSchema> = {}
): InferSchema<TSchema> {
  const normalizedSource: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    normalizedSource[key] = coerce ? coerceValue(value) : value;
  }

  const candidate = defaults ? { ...defaults, ...normalizedSource } : normalizedSource;
  const result = schema.safeParse(candidate);

  if (!result.success) {
    const wrapped = new EnvValidationError('Invalid environment configuration', result.error);
    if (onValidationError) {
      const handlerResult = onValidationError(wrapped);
      if (handlerResult !== undefined) {
        return handlerResult as unknown as InferSchema<TSchema>;
      }
    }
    throw wrapped;
  }

  return result.data as InferSchema<TSchema>;
}

export function defineEnv<TSchema extends ZodTypeAny>(
  schema: TSchema,
  options?: Omit<ParseEnvOptions<TSchema>, 'coerce'>
): { readonly schema: TSchema; readonly load: () => InferSchema<TSchema>; readonly reload: () => InferSchema<TSchema> } {
  let cache: InferSchema<TSchema> | undefined;

  const load = () => {
    cache = parseEnv(schema, { ...options });
    return cache;
  };

  const reload = () => parseEnv(schema, { ...options });

  return {
    schema,
    load,
    reload
  } as const;
}

function coerceValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!Number.isNaN(Number(value)) && value.trim() !== '') return Number(value);
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  return value;
}
