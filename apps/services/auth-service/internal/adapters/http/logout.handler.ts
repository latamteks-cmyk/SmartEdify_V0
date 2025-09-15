import { Request, Response } from 'express';
import { LogoutRequestSchema } from './logout.dto';

export async function logoutHandler(req: Request, res: Response) {
  const parseResult = LogoutRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
  }
  const { token } = parseResult.data;
  // Lógica de logout: invalidar token, limpiar sesión, etc.
  // ...
  return res.status(204).send();
}
