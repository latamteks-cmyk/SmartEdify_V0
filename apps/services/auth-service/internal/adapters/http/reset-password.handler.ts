import { Request, Response } from 'express';
import { ResetPasswordRequestSchema } from './reset-password.dto';
import { getUserById } from '../db/pg.adapter';
import { consumePasswordResetToken } from '../redis/redis.adapter';
import pool from '../db/pg.adapter';
import { hashPassword } from '../../security/crypto';
import { passwordResetCompletedCounter } from '../../../cmd/server/main';

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
  const user = await getUserById(tokenObj.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  // Hashear y persistir nueva contraseña
  const hashed = await hashPassword(newPassword);
  await pool.query('UPDATE users SET pwd_hash=$1 WHERE id=$2', [hashed, user.id]);
  // token ya consumido en consumePasswordResetToken
  passwordResetCompletedCounter.inc();
  return res.status(200).json({ message: 'Contraseña actualizada' });
}
