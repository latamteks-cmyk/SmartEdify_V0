import argon2 from 'argon2';

// Parámetros recomendados Argon2id para entorno server con costo moderado
// Ajustables vía env si se requiere tuning futuro
const isTest = process.env.NODE_ENV === 'test';
const DEFAULT_MEMORY = isTest ? 4096 : Number(process.env.AUTH_ARGON2_MEMORY_KIB || 19456); // menor en test
const DEFAULT_ITERATIONS = isTest ? 2 : Number(process.env.AUTH_ARGON2_ITERATIONS || 3); // Argon2 exige >=2
const DEFAULT_PARALLELISM = Number(process.env.AUTH_ARGON2_PARALLELISM || 1);

export async function hashPassword(plain: string): Promise<string> {
  // Usa Argon2id (por defecto en lib) con parámetros explícitos
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: DEFAULT_MEMORY,
    timeCost: DEFAULT_ITERATIONS,
    parallelism: DEFAULT_PARALLELISM
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch (_e) {
    return false;
  }
}
