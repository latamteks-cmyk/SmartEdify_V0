import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { z } from 'zod';

// For now, we'll store preferences in memory
// In production, this should be in a database table
const userPreferences = new Map<string, UserPreferences>();

interface UserPreferences {
  userId: string;
  language: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  theme: 'light' | 'dark';
  timezone: string;
}

const preferencesSchema = z.object({
  language: z.string().min(2).max(5).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  timezone: z.string().optional(),
});

const defaultPreferences: Omit<UserPreferences, 'userId'> = {
  language: 'es',
  notifications: {
    email: true,
    sms: false,
    push: true,
  },
  theme: 'light',
  timezone: 'America/Bogota',
};

export async function getPreferencesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const preferences = userPreferences.get(req.user.id) || {
      userId: req.user.id,
      ...defaultPreferences,
    };

    return res.json({ preferences });
  } catch (error) {
    console.error('Error getting preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updatePreferencesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validation = preferencesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const currentPreferences = userPreferences.get(req.user.id) || {
      userId: req.user.id,
      ...defaultPreferences,
    };

    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      ...validation.data,
      notifications: {
        ...currentPreferences.notifications,
        ...validation.data.notifications,
      },
    };

    userPreferences.set(req.user.id, updatedPreferences);

    return res.json({ 
      message: 'Preferences updated successfully', 
      preferences: updatedPreferences 
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to clear preferences (for testing)
export function clearPreferences() {
  userPreferences.clear();
}