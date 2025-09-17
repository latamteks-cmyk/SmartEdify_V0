import type { Response } from 'supertest';

const KEY_PLACEHOLDERS: Record<string, string> = {
  id: '<id>',
  access_token: '<access_token>',
  refresh_token: '<refresh_token>',
  expires_in: '<expires_in>',
  uptime_s: '<uptime_s>',
  latency_ms: '<latency_ms>',
  retry_in_s: '<retry_in_s>',
  jti: '<jti>',
  'x-request-id': '<x-request-id>'
};

const HEADER_KEYS = ['content-type', 'x-request-id'];

function looksLikeJwt(value: string) {
  return typeof value === 'string' && value.split('.').length === 3;
}

function looksLikeUuid(value: string) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function looksLikeIsoDate(value: string) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
}

function sanitizeValue(value: any, key?: string): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [innerKey, innerValue] of Object.entries(value)) {
      out[innerKey] = sanitizeValue(innerValue, innerKey);
    }
    return out;
  }
  if (typeof value === 'number') {
    if (key && KEY_PLACEHOLDERS[key]) {
      return KEY_PLACEHOLDERS[key];
    }
    return value;
  }
  if (typeof value === 'string') {
    if (key && KEY_PLACEHOLDERS[key]) {
      return KEY_PLACEHOLDERS[key];
    }
    if (looksLikeJwt(value)) return '<jwt>';
    if (looksLikeUuid(value)) return '<uuid>';
    if (looksLikeIsoDate(value)) return '<iso-date>';
    return value;
  }
  return value;
}

function sanitizeHeaders(headers: Record<string, string | string[] | undefined>) {
  const sanitized: Record<string, any> = {};
  for (const header of HEADER_KEYS) {
    const value = headers[header];
    if (value === undefined) continue;
    sanitized[header] = sanitizeValue(value, header);
  }
  return sanitized;
}

export function contractSnapshot(response: Response) {
  return {
    status: response.status,
    headers: sanitizeHeaders(response.headers as Record<string, string | string[] | undefined>),
    body: sanitizeValue(response.body)
  };
}
