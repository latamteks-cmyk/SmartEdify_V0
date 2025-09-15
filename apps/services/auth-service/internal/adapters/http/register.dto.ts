// DTO para registro de usuario
export interface RegisterRequestDTO {
  email: string;
  password: string;
  name: string;
}

// Validación con Zod
import { z } from 'zod';
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
});
