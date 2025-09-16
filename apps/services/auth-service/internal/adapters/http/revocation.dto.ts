import { z } from 'zod';

export const RevocationRequestSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.string().optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional()
});

export type RevocationRequest = z.infer<typeof RevocationRequestSchema>;
