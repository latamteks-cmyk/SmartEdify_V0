import { z } from 'zod';

export const IntrospectionRequestSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.string().optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional()
});

export type IntrospectionRequest = z.infer<typeof IntrospectionRequestSchema>;
