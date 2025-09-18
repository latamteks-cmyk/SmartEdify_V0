import { v4 as uuidv4 } from 'uuid';
import { getUserServiceClient } from '../user-service.client';
import { hashPassword } from '../../security/crypto';
import * as pgAdapter from '@db/pg.adapter';

const DEFAULT_ROLE = process.env.AUTH_DEFAULT_ROLE || 'user';

export async function registerUser(email: string, password: string, name: string, tenantId: string) {
    const userServiceClient = getUserServiceClient();
    let validation: any;
    try {
        validation = await userServiceClient.validateUser({ email, tenantId, name });
    } catch (err) {
        if (process.env.AUTH_TEST_LOGS) {
            console.error('[register] User Service validation failed', err);
        }
        throw new Error('User Service no disponible');
    }

    if (!validation?.allowed) {
        throw new Error('Usuario no permitido por User Service');
    }

    const accountStatus = validation.status || 'active';
    const existing = await pgAdapter.getUserByEmail(email, tenantId);
    if (existing) {
        throw new Error('El usuario ya existe');
    }

    const hashed = await hashPassword(password);
    const user = await pgAdapter.createUser({
        tenant_id: tenantId,
        email,
        pwd_hash: hashed,
        pwd_salt: '',
        name,
        status: accountStatus,
        created_at: new Date()
    });

    const rolesToAssign: string[] = Array.isArray(validation.roles) && validation.roles.length > 0
        ? validation.roles
        : [DEFAULT_ROLE];
    const uniqueRoles = Array.from(new Set(rolesToAssign));
    for (const role of uniqueRoles) {
        try {
            await pgAdapter.assignUserRole(user.id, tenantId, role);
        } catch (e) {
            if (process.env.AUTH_TEST_LOGS) console.error('[register] assignUserRole failed', e);
        }
    }

    let roles: string[] = [];
    try {
        roles = await pgAdapter.getUserRoles(user.id, tenantId);
    } catch (e) {
        if (process.env.AUTH_TEST_LOGS) console.error('[register] getUserRoles failed', e);
    }
    if (!roles || roles.length === 0) roles = uniqueRoles.length ? uniqueRoles : [DEFAULT_ROLE];
    const permissions: string[] = Array.isArray(validation.permissions) ? validation.permissions : [];

    return {
        id: user.id,
        email,
        name,
        status: accountStatus,
        roles,
        permissions
    };
}
