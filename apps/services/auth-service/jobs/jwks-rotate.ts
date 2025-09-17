/*
 * Copyright (c) 2024 SmartEdify contributors
 * Licensed under the MIT License. See the LICENSE file in the project root for details.
 */

import 'dotenv/config';
import pool, { endPool } from '../internal/adapters/db/pg.adapter';
import { getPublicJwks, rotateKeys, SigningKey } from '../internal/security/keys';

type PublishedJwk = {
  kid?: string;
  status?: string;
  [key: string]: unknown;
};

type PublishedJwks = {
  keys?: PublishedJwk[];
  [key: string]: unknown;
};

type AgeRow = {
  kid: string;
  status: string;
  created_at: Date | string;
  promoted_at?: Date | string | null;
};

interface AgeMetric {
  kid: string;
  status: string;
  createdAt: string;
  promotedAt: string | null;
  ageSeconds: number;
  ageHours: number;
  ageDays: number;
}

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function fetchAgeMetrics(): Promise<AgeMetric[]> {
  const { rows } = await pool.query<AgeRow>(
    "SELECT kid, status, created_at, promoted_at FROM auth_signing_keys WHERE status IN ('current','next','retiring')"
  );
  const now = Date.now();
  return rows.map(row => {
    const createdAt = normalizeDate(row.created_at) ?? new Date();
    const promotedAt = normalizeDate(row.promoted_at);
    const reference = promotedAt ?? createdAt;
    const ageSeconds = Math.max(0, Math.floor((now - reference.getTime()) / 1000));
    return {
      kid: String(row.kid),
      status: String(row.status),
      createdAt: createdAt.toISOString(),
      promotedAt: promotedAt ? promotedAt.toISOString() : null,
      ageSeconds,
      ageHours: Number((ageSeconds / 3600).toFixed(3)),
      ageDays: Number((ageSeconds / 86400).toFixed(3))
    };
  });
}

function verifyJwksConsistency(jwks: PublishedJwks, expectedCurrent: SigningKey, expectedNext: SigningKey | null) {
  const keys: PublishedJwk[] = Array.isArray(jwks?.keys) ? jwks.keys : [];
  const current = keys.find(k => k.status === 'current');
  const next = keys.find(k => k.status === 'next');
  if (!current) {
    throw new Error('No existe clave current en JWKS tras la rotación');
  }
  if (current.kid !== expectedCurrent.kid) {
    throw new Error(`La clave current publicada (${current.kid}) no coincide con la promovida (${expectedCurrent.kid})`);
  }
  if (expectedNext && (!next || next.kid !== expectedNext.kid)) {
    throw new Error(
      `La clave next publicada (${next ? next.kid : 'null'}) no coincide con la generada (${expectedNext.kid})`
    );
  }
}

function printMetrics(metrics: AgeMetric[]): void {
  console.log('# JWKS rotation metrics');
  console.log('# TYPE auth_jwks_key_age_hours gauge');
  metrics.forEach(metric => {
    const labels = `status="${metric.status}",kid="${metric.kid}"`;
    console.log(`auth_jwks_key_age_hours{${labels}} ${metric.ageHours}`);
  });
}

function validateAgeMetrics(metrics: AgeMetric[]): void {
  if (!metrics.length) {
    throw new Error('No se recuperaron métricas de edad para las claves activas');
  }
  const statuses = new Set(metrics.map(metric => metric.status));
  if (!statuses.has('current')) {
    throw new Error('La métrica de edad no incluye la clave current tras la rotación');
  }
  const invalid = metrics.filter(metric => Number.isNaN(metric.ageHours));
  if (invalid.length) {
    throw new Error(`Se detectaron métricas inválidas: ${invalid.map(m => m.kid).join(', ')}`);
  }
}

async function main() {
  const before = (await getPublicJwks()) as PublishedJwks;
  console.log('[jwks-rotate] claves antes de rotar:', JSON.stringify(before, null, 2));

  const { newCurrent, newNext } = await rotateKeys();
  console.log('[jwks-rotate] rotación ejecutada:', JSON.stringify({
    newCurrent: { kid: newCurrent.kid, status: newCurrent.status },
    newNext: newNext ? { kid: newNext.kid, status: newNext.status } : null
  }, null, 2));

  const after = (await getPublicJwks()) as PublishedJwks;
  verifyJwksConsistency(after, newCurrent, newNext ?? null);
  console.log('[jwks-rotate] JWKS publicado tras rotación:', JSON.stringify(after, null, 2));

  const metrics = await fetchAgeMetrics();
  validateAgeMetrics(metrics);
  console.log('[jwks-rotate] métricas de edad:', JSON.stringify(metrics, null, 2));
  printMetrics(metrics);
}

main()
  .then(() => {
    return endPool();
  })
  .catch(async err => {
    console.error('[jwks-rotate] error en rotación', err);
    await endPool();
    process.exitCode = 1;
  });
