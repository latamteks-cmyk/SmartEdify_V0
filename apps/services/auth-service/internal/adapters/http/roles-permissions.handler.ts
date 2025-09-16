import { Request, Response } from 'express';
import { listRoles } from '../db/pg.adapter';

function parseList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const normalized = value.map(v => String(v).trim()).filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : [...fallback];
  }
  if (typeof value === 'string') {
    const items = value.split(',').map(v => v.trim()).filter(Boolean);
    return items.length ? Array.from(new Set(items)) : [...fallback];
  }
  return [...fallback];
}

const FALLBACK_ROLES = parseList(process.env.AUTH_FALLBACK_ROLES, ['admin', 'user', 'guest']);
const DEFAULT_PERMISSION_FALLBACK = parseList(process.env.AUTH_FALLBACK_PERMISSIONS, ['read']);

const ROLE_PERMISSIONS: Record<string, string[]> = (() => {
  const base: Record<string, string[]> = {
    admin: ['read', 'write', 'delete'],
    user: ['read', 'write'],
    guest: ['read']
  };
  const overrides = process.env.AUTH_ROLE_PERMISSIONS;
  if (overrides) {
    try {
      const parsed = JSON.parse(overrides);
      if (parsed && typeof parsed === 'object') {
        for (const [role, value] of Object.entries(parsed as Record<string, unknown>)) {
          const normalizedRole = role.toLowerCase();
          base[normalizedRole] = parseList(value, DEFAULT_PERMISSION_FALLBACK);
        }
      }
    } catch (e) {
      if (process.env.AUTH_TEST_LOGS) console.error('[permissions] AUTH_ROLE_PERMISSIONS parse error', e);
    }
  }
  for (const key of Object.keys(base)) {
    base[key] = parseList(base[key], DEFAULT_PERMISSION_FALLBACK);
  }
  return base;
})();

function resolvePermissionsForRole(role: string): string[] {
  const key = role.toLowerCase();
  const perms = ROLE_PERMISSIONS[key];
  if (perms && perms.length > 0) return perms;
  return [...DEFAULT_PERMISSION_FALLBACK];
}

function pickTenantId(req: Request): string | undefined {
  const raw = (req.query.tenant_id || req.query.tenantId) as string | undefined;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function rolesHandler(req: Request, res: Response) {
  const tenantId = pickTenantId(req);
  let roles: string[] = [];
  try {
    roles = await listRoles(tenantId);
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) console.error('[roles] listRoles failed', e);
  }
  const combined = new Set<string>([...roles, ...FALLBACK_ROLES]);
  res.status(200).json({ roles: Array.from(combined).sort() });
}

export async function permissionsHandler(req: Request, res: Response) {
  const tenantId = pickTenantId(req);
  const roleFilter = typeof req.query.role === 'string' ? req.query.role.trim() : undefined;
  let roles: string[] = [];
  try {
    roles = await listRoles(tenantId);
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) console.error('[permissions] listRoles failed', e);
  }
  if (roleFilter && roleFilter.length > 0) {
    const permissions = resolvePermissionsForRole(roleFilter);
    return res.status(200).json({ role: roleFilter, permissions });
  }
  const universe = new Set<string>();
  const rolesToInspect = roles.length > 0 ? roles : Object.keys(ROLE_PERMISSIONS);
  for (const role of new Set([...rolesToInspect, ...FALLBACK_ROLES])) {
    for (const perm of resolvePermissionsForRole(role)) {
      universe.add(perm);
    }
  }
  if (universe.size === 0) {
    for (const perm of DEFAULT_PERMISSION_FALLBACK) universe.add(perm);
  }
  res.status(200).json({ permissions: Array.from(universe).sort() });
}
