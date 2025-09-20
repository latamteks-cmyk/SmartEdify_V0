import { Request, Response } from 'express';
import { createUserRepository } from '../db/repository.factory';

const userRepository = createUserRepository();

export async function deleteUserHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await userRepository.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    await userRepository.deleteUser(id);
    return res.status(200).json({ message: 'Usuario eliminado', id });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
