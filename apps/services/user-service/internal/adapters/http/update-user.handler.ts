import { Request, Response } from 'express';
import { updateUser, findUserById } from '../db/memory';

export async function updateUserHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { name, email } = req.body;
  const user = findUserById(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  updateUser(id, { name, email });
  return res.status(200).json({ message: 'Usuario actualizado', user: { ...user, name, email } });
}
