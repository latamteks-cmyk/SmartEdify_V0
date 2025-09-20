import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { createUserRepository } from '../db/repository.factory';
import { z } from 'zod';

const userRepository = createUserRepository();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
});

export async function getProfileHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await userRepository.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...profile } = user;
    return res.json({ profile });
  } catch (error) {
    console.error('Error getting profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProfileHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const { name, email } = validation.data;
    
    // Check if user exists
    const user = await userRepository.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await userRepository.findUserByEmail(email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Update user
    await userRepository.updateUser(req.user.id, { name, email });
    
    // Return updated profile
    const updatedUser = await userRepository.findUserById(req.user.id);
    const { password, ...profile } = updatedUser!;
    
    return res.json({ 
      message: 'Profile updated successfully', 
      profile 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}