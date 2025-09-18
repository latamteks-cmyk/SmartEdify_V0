/*
 * Copyright (c) 2024 SmartEdify contributors
 * Licensed under the MIT License. See the LICENSE file in the project root for details.
 */

import 'dotenv/config';
import pool, { endPool } from '../internal/adapters/db/pg.adapter';

type PublishedJwk = {
  kid?: string;
  status?: string;
  [key: string]: unknown;
};

type PublishedJwks = {
  keys?: PublishedJwk[];
  [key: string]: unknown;
};

type RotateResponse = {
  message?: string;
  current?: { kid?: string | null } | null;
  next?: { kid?: string | null } | null;
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

const DEFAULT_ADMIN_HEADER = 'x-admin-api-key';

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveBaseUrl(): string {
  const candidates = [
    process.env.AUTH_ADMIN_BASE_URL,
    process.env.AUTH_BASE_URL,
    process.env.AUTH_PUBLIC_URL,
    process.env.AUTH_ISSUER_URL,
    process.env.AUTH_ISSUER
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.replace(/\/$/, '');
    }
  }
  return 'http://localhost:8080';
}

function resolveAdminHeader(): string {
  const header = process.env.AUTH_ADMIN_API_HEADER;
  if (header && header.trim()) {
    return header.trim();
  }
  return DEFAULT_ADMIN_HEADER;
}

function resolveAdminKey(): string {
  const key = process.env.AUTH_ADMIN_API_KEY;
  if (!key || !key.trim()) {
    throw new Error('AUTH_ADMIN_API_KEY no está configurado para ejecutar la rotación');
  }
  return key.trim();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status}: ${text}`);
  }
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`Invalid JSON response from ${url}: ${(err as Error).message}`);
  }
}

async function fetchPublishedJwks(baseUrl: string): Promise<PublishedJwks> {
  return fetchJson<PublishedJwks>(`${baseUrl}/.well-known/jwks.json`, {
    headers: {
      accept: 'application/json'
    }
  });
}

async function rotateKeysViaAdmin(baseUrl: string, headerName: string, adminKey: string): Promise<RotateResponse> {
  return fetchJson<RotateResponse>(`${baseUrl}/admin/rotate-keys`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [headerName]: adminKey
    },
    body: JSON.stringify({})
  });
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

function verifyJwksConsistency(jwks: PublishedJwks, expectedCurrentKid: string | null, expectedNextKid: string | null) {
  const keys: PublishedJwk[] = Array.isArray(jwks?.keys) ? jwks.keys : [];
  const current = keys.find(k => k.status === 'current');
  const next = keys.find(k => k.status === 'next');
  if (!current) {
    throw new Error('No existe clave current en JWKS tras la rotación');
  }
  if (expectedCurrentKid && current.kid !== expectedCurrentKid) {
    throw new Error(`La clave current publicada (${current.kid}) no coincide con la promovida (${expectedCurrentKid})`);
  }
  if (expectedNextKid && (!next || next.kid !== expectedNextKid)) {
    throw new Error(
      `La clave next publicada (${next ? next.kid : 'null'}) no coincide con la generada (${expectedNextKid})`
    );
  }
}

function printMetrics(metrics: AgeMetric[]): string {
  console.log('# JWKS rotation metrics');
  console.log('# TYPE auth_jwks_key_age_hours gauge');
  const payloadLines: string[] = [];
  metrics.forEach(metric => {
    const labels = `status="${metric.status}",kid="${metric.kid}"`;
    const line = `auth_jwks_key_age_hours{${labels}} ${metric.ageHours}`;
    payloadLines.push(line);
    console.log(line);
  });
  return ['# TYPE auth_jwks_key_age_hours gauge', ...payloadLines].join('\n') + '\n';
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

async function pushMetrics(metricsPayload: string): Promise<void> {
  const url = process.env.JWKS_METRICS_PUSH_URL;
  if (!url || !url.trim()) {
    return;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain'
    },
    body: metricsPayload
  });
  if (!res.ok) {
    throw new Error(`Falló el push de métricas (${res.status})`);
  }
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const adminHeader = resolveAdminHeader();
  const adminKey = resolveAdminKey();

  const before = await fetchPublishedJwks(baseUrl);
  console.log('[jwks-rotate] claves antes de rotar:', JSON.stringify(before, null, 2));

  const rotationResult = await rotateKeysViaAdmin(baseUrl, adminHeader, adminKey);
  console.log('[jwks-rotate] rotación ejecutada:', JSON.stringify(rotationResult, null, 2));

  const after = await fetchPublishedJwks(baseUrl);
  const expectedCurrentKid = rotationResult.current?.kid ?? null;
  const expectedNextKid = rotationResult.next?.kid ?? null;
  verifyJwksConsistency(after, expectedCurrentKid, expectedNextKid);
  console.log('[jwks-rotate] JWKS publicado tras rotación:', JSON.stringify(after, null, 2));

  const metrics = await fetchAgeMetrics();
  validateAgeMetrics(metrics);
  console.log('[jwks-rotate] métricas de edad:', JSON.stringify(metrics, null, 2));
  const payload = printMetrics(metrics);
  await pushMetrics(payload);
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
