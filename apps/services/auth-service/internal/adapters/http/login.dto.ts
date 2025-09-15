// DTO para login de usuario
export interface LoginRequestDTO {
  email: string;
  password: string;
}

import { z } from 'zod';
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
