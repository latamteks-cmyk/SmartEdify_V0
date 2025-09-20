import { Request, Response } from 'express';
import { createUserRepository } from '../db/repository.factory';

const userRepository = createUserRepository();

export async function listUsersHandler(_req: Request, res: Response) {
  try {
    const users = await userRepository.getAllUsers?.() || [];
    const usersWithoutPassword = users.map(u => ({ id: u.id, email: u.email, name: u.name }));
    return res.status(200).json({ items: usersWithoutPassword });
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
