const ISSUER_ENV_KEYS = [
  'AUTH_ISSUER',
  'AUTH_ISSUER_URL',
  'AUTH_PUBLIC_URL',
  'AUTH_BASE_URL'
];

function sanitize(url: string): string {
  return url.replace(/\/+$/, '');
}

function ensureUrl(candidate: string): string | null {
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    const origin = `${parsed.protocol}//${parsed.host}`;
    const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') : '';
    return sanitize(origin + path);
  } catch (e) {
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    const prefix = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    try {
      const parsed = new URL(prefix);
      const origin = `${parsed.protocol}//${parsed.host}`;
      const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') : '';
      return sanitize(origin + path);
    } catch {
      return sanitize(trimmed);
    }
  }
}

let cachedIssuer: string | null = null;

export function getIssuer(): string {
  if (cachedIssuer) return cachedIssuer;
  for (const key of ISSUER_ENV_KEYS) {
    const value = process.env[key];
    const ensured = value ? ensureUrl(value) : null;
    if (ensured) {
      cachedIssuer = ensured;
      return cachedIssuer;
    }
  }
  const port = process.env.AUTH_PORT || '8080';
  const host = process.env.AUTH_HOST || 'localhost';
  const proto = process.env.AUTH_USE_TLS === 'true' ? 'https' : 'http';
  cachedIssuer = `${proto}://${host.replace(/\/+$/, '')}:${port}`;
  return cachedIssuer;
}

export function issuerUrl(path: string): string {
  const base = getIssuer();
  if (!path) return base;
  if (/^https?:\/\//.test(path)) return sanitize(path);
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
