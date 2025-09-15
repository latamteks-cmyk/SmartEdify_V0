// DTO para logout
export interface LogoutRequestDTO {
  token: string;
}

import { z } from 'zod';
export const LogoutRequestSchema = z.object({
  token: z.string().min(10)
});
