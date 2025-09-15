import { setTimeout as delay } from 'node:timers/promises';

export interface JwksProviderOptions {
  url: string;
  cacheTtlMs: number;
  fetchFn?: typeof fetch;
  logger?: { warn: Function; error: Function; debug: Function };
}

interface JwkKey { kid: string; kty: string; alg?: string; use?: string; n?: string; e?: string; crv?: string; x?: string; y?: string; }

export class JwksProvider {
  private cache: Map<string, string> = new Map();
  private cacheExpiresAt = 0;
  private refreshing = false;
  constructor(private opts: JwksProviderOptions) {}

  async getPublicKey(kid: string): Promise<string | undefined> {
    const now = Date.now();
    if (now > this.cacheExpiresAt) {
      await this.refreshSafe();
    }
    return this.cache.get(kid);
  }

  private async refreshSafe() {
    if (this.refreshing) return; // evitar tormenta
    this.refreshing = true;
    try {
      await this.refresh();
    } catch (e) {
      this.opts.logger?.warn({ err: e }, 'jwks refresh failed');
    } finally {
      this.refreshing = false;
    }
  }

  private async refresh(retries = 3) {
    const f = this.opts.fetchFn || fetch;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await f(this.opts.url, { headers: { 'accept': 'application/json' } });
        if (!res.ok) throw new Error(`JWKS HTTP ${res.status}`);
        const body = await res.json() as { keys: JwkKey[] };
        const newCache = new Map<string, string>();
        for (const k of body.keys) {
          if (k.kty === 'RSA' && k.n && k.e) {
            // Construir PEM RSA
            const pub = rsaComponentsToPem(k.n, k.e);
            newCache.set(k.kid, pub);
          } else if (k.kty === 'EC' && k.x && k.y && k.crv) {
            // Para simplificar omitimos EC construcción detallada aquí; se podría agregar.
            // Placeholder: omitimos claves EC si no se transforma.
            continue;
          }
        }
        this.cache = newCache;
        this.cacheExpiresAt = Date.now() + this.opts.cacheTtlMs;
        this.opts.logger?.debug({ size: this.cache.size }, 'jwks cache refreshed');
        return;
      } catch (e) {
        if (attempt === retries) throw e;
        await delay(200 * attempt);
      }
    }
  }
}

// Utilidad: decodificar base64url a buffer
function b64urlToBuffer(b64url: string) {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function rsaComponentsToPem(n: string, e: string): string {
  const modulus = b64urlToBuffer(n);
  const exponent = b64urlToBuffer(e);
  // ASN.1 DER sequence minimal (no librería externa para mantener footprint). Referencia RFC 3447.
  const der = derEncodeSequence([
    derEncodeInteger(modulus),
    derEncodeInteger(exponent)
  ]);
  const bitString = Buffer.concat([
    Buffer.from([0x30]), derLengthBuffer(der.length), der,
  ]);
  const pemBody = bitString.toString('base64').match(/.{1,64}/g)?.join('\n');
  return `-----BEGIN RSA PUBLIC KEY-----\n${pemBody}\n-----END RSA PUBLIC KEY-----`;
}

function derEncodeInteger(buf: Buffer): Buffer {
  // Asegurar si MSB está a 1, anteponer 0x00 para valor positivo
  if (buf[0] & 0x80) buf = Buffer.concat([Buffer.from([0x00]), buf]);
  return Buffer.concat([Buffer.from([0x02]), derLengthBuffer(buf.length), buf]);
}

function derEncodeSequence(parts: Buffer[]): Buffer {
  const total = Buffer.concat(parts);
  return Buffer.concat([Buffer.from([0x30]), derLengthBuffer(total.length), total]);
}

function derLengthBuffer(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len]);
  const bytes: number[] = [];
  let v = len;
  while (v > 0) { bytes.unshift(v & 0xff); v >>= 8; }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
