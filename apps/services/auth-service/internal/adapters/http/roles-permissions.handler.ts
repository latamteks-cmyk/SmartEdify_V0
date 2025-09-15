// Handler para /roles
import { Request, Response } from 'express';

export async function rolesHandler(req: Request, res: Response) {
  // Lógica: obtener lista de roles desde DB/configuración
  // ...
  return res.status(200).json({ roles: ['admin', 'user', 'guest'] });
}

// Handler para /permissions
export async function permissionsHandler(req: Request, res: Response) {
  // Lógica: obtener lista de permisos desde DB/configuración
  // ...
  return res.status(200).json({ permissions: ['read', 'write', 'delete'] });
}
