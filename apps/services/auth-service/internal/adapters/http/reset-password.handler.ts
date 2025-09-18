import { Request, Response } from 'express';

import { passwordResetCompletedCounter } from '../../../cmd/server/main';
import { hashPassword } from '../../security/crypto';
import * as pgAdapter from '@db/pg.adapter';
import { consumePasswordResetToken, revokeAllUserSessions } from '../redis/redis.adapter';

import { ResetPasswordRequestSchema } from './reset-password.dto';


export async function resetPasswordHandler(req: Request, res: Response) {
  const parseResult = ResetPasswordRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
  }
  const { token, newPassword } = parseResult.data;
  const tokenObj = await consumePasswordResetToken(token);
  if (!tokenObj) {
    return res.status(400).json({ error: 'Token inválido o expirado' });
  }
  const user = await pgAdapter.getUserById(tokenObj.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  
  // Hashear y persistir nueva contraseña
  const hashed = await hashPassword(newPassword);
  await pgAdapter.pool.query('UPDATE users SET pwd_hash=$1 WHERE id=$2', [hashed, user.id]);
  
  // Invalidar todas las sesiones activas del usuario
  await revokeAllUserSessions(user.id);

  passwordResetCompletedCounter.inc();
  return res.status(200).json({ message: 'Contraseña actualizada y todas las sesiones han sido cerradas.' });
}
