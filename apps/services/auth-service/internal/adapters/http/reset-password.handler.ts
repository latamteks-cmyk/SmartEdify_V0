import { Request, Response } from 'express';
import { ResetPasswordRequestSchema } from './reset-password.dto';
import { resetPassword } from '../../services/reset-password.service';

export async function resetPasswordHandler(req: Request, res: Response) {
  const parseResult = ResetPasswordRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
  }

  const { token, newPassword } = parseResult.data;

  try {
    await resetPassword(token, newPassword);
    return res.status(200).json({ message: 'Contraseña actualizada y todas las sesiones han sido cerradas.' });
  } catch (error: any) {
    let statusCode = 500;
    if (error.message === 'Token inválido o expirado') {
      statusCode = 400;
    } else if (error.message === 'Usuario no encontrado') {
      statusCode = 404;
    }
    return res.status(statusCode).json({ error: error.message });
  }
}
