import { Request, Response } from 'express';

import { passwordResetRequestedCounter } from '../../../cmd/server/main';
import * as pgAdapter from '@db/pg.adapter';
import { savePasswordResetToken } from '../redis/redis.adapter';

import { ForgotPasswordRequestSchema } from './forgot-password.dto';

export async function forgotPasswordHandler(req: Request, res: Response) {
  const parseResult = ForgotPasswordRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
  }
  const { email } = parseResult.data;
  const tenant_id = req.body.tenant_id || 'default';
  const user = await pgAdapter.getUserByEmail(email, tenant_id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  // Generar token de recuperación (usar namespace distinto para no chocar con refresh tokens normales)
  const token = 'reset-' + Math.random().toString(36).substring(2);
  await savePasswordResetToken(token, { userId: user.id });
  passwordResetRequestedCounter.inc();
  // Simular envío de email
  return res.status(200).json({ message: 'Email enviado', token });
}
