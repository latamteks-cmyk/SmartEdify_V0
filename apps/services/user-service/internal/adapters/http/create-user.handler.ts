import { Request, Response } from 'express';
import { createUserRepository } from '../db/repository.factory';
import { v4 as uuidv4 } from 'uuid';

const userRepository = createUserRepository();

export async function createUserHandler(req: Request, res: Response) {
  try {
    const { email, name, password, id: customId } = req.body;
    const id = customId || uuidv4();
    
    // Check if user already exists
    const existingUser = await userRepository.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    await userRepository.addUser({ id, email, name, password });
    return res.status(201).json({ message: 'Usuario creado', user: { id, email, name } });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
