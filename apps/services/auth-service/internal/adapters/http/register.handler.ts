import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { hashPassword } from '../../security/crypto';
import * as pgAdapter from '@db/pg.adapter';
import { mockValidateUser } from '../user-service.mock';

import { RegisterRequestSchema } from './register.dto';

const DEFAULT_ROLE = process.env.AUTH_DEFAULT_ROLE || 'user';

// Handler definitivo para /register
export async function registerHandler(req: Request, res: Response) {
  const parseResult = RegisterRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
  }
  const { email, password, name } = parseResult.data;
  const id = uuidv4();
  const tenant_id = req.body.tenant_id || 'default';
  // Validación cruzada con User Service (mock)
  const isValidUser = await mockValidateUser(email);
  if (!isValidUser) {
    return res.status(403).json({ error: 'Usuario no permitido por User Service' });
  }
  // Verificar si el usuario ya existe
  const existing = await pgAdapter.getUserByEmail(email, tenant_id);
  if (existing) {
    return res.status(409).json({ error: 'El usuario ya existe' });
  }
  // Hash Argon2id
  const hashed = await hashPassword(password);
  // Guardar usuario en Postgres (pwd_salt queda en blanco hasta limpiar esquema)
  const user = await pgAdapter.createUser({
    tenant_id,
    email,
    pwd_hash: hashed,
    pwd_salt: '',
    name,
    created_at: new Date()
  });
  try {
  await pgAdapter.assignUserRole(user.id, tenant_id, DEFAULT_ROLE);
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) console.error('[register] assignUserRole failed', e);
  }
  let roles: string[] = [];
  try {
  roles = await pgAdapter.getUserRoles(user.id, tenant_id);
  } catch (e) {
    if (process.env.AUTH_TEST_LOGS) console.error('[register] getUserRoles failed', e);
  }
  if (!roles || roles.length === 0) roles = [DEFAULT_ROLE];
  if (process.env.AUTH_TEST_LOGS) {
    // eslint-disable-next-line no-console
    console.log('[register.handler] user creado', user);
  }
  return res.status(201).json({ message: 'Usuario registrado', user: { id: user?.id, email, name, roles } });
}
