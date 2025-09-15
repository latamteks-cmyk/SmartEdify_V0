// DTO para reset-password
export interface ResetPasswordRequestDTO {
  token: string;
  newPassword: string;
}

import { z } from 'zod';
export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8)
});
