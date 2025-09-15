import { Request, Response } from 'express';
import { deleteUser, findUserById } from '../db/memory';

export async function deleteUserHandler(req: Request, res: Response) {
  const { id } = req.params;
  const user = findUserById(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  deleteUser(id);
  return res.status(200).json({ message: 'Usuario eliminado', id });
}
