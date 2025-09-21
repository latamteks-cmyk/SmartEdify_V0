import fs from 'fs';
import https from 'https';
import { config } from './env';

let cachedAgent: https.Agent | null = null;

export function getOutgoingHttpsAgent(): https.Agent | undefined {
  if (cachedAgent) return cachedAgent;

  const rejectUnauthorized = config.OUTGOING_TLS_REJECT_UNAUTHORIZED;
  const caPath = config.OUTGOING_TLS_CA_FILE;

  if (!rejectUnauthorized && process.env.NODE_ENV === 'production') {
    // Do not allow disabling TLS verification in production
    throw new Error('TLS verification cannot be disabled in production');
  }

  let ca: Buffer | undefined = undefined;
  if (caPath && fs.existsSync(caPath)) {
    ca = fs.readFileSync(caPath);
  }

  cachedAgent = new https.Agent({
    rejectUnauthorized,
    ca,
  });
  return cachedAgent;
}

