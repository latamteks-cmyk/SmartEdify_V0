import { Request, Response, NextFunction } from 'express';

const DEFAULT_HEADER = 'x-admin-api-key';

function getHeaderName(): string {
  const raw = process.env.AUTH_ADMIN_API_HEADER;
  return (raw && raw.trim()) || DEFAULT_HEADER;
}

function getExpectedCredential(): string | null {
  const raw = process.env.AUTH_ADMIN_API_KEY;
  if (!raw || !raw.trim()) {
    return null;
  }
  return raw;
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const expected = getExpectedCredential();
  if (!expected) {
    res.status(503).json({ error: 'admin_auth_unconfigured' });
    return;
  }
  const headerName = getHeaderName();
  const provided = req.header(headerName);
  if (!provided) {
    res.status(401).json({ error: 'admin_auth_required' });
    return;
  }
  if (provided !== expected) {
    res.status(403).json({ error: 'admin_auth_invalid' });
    return;
  }
  next();
}

export function __resetAdminAuthForTests() {
  if (process.env.NODE_ENV !== 'test') return;
  // Allow tests to mutate configuration between cases if needed.
  // Currently nothing to reset, but keep hook for parity with other middleware helpers.
}
