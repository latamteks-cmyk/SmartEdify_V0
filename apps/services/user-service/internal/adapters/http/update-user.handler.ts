import { Request, Response } from 'express';
import { createUserRepository } from '../db/repository.factory';

const userRepository = createUserRepository();

export async function updateUserHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    
    const user = await userRepository.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    await userRepository.updateUser(id, { name, email });
    const updatedUser = await userRepository.findUserById(id);
    const { password, ...userWithoutPassword } = updatedUser!;
    
    return res.status(200).json({ 
      message: 'Usuario actualizado', 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
