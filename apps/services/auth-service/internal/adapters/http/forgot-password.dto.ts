// DTO para forgot-password
export interface ForgotPasswordRequestDTO {
  email: string;
}

import { z } from 'zod';
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email()
});
