import { z } from 'zod';

const codePattern = /^[A-Za-z0-9\-._~]+$/;

export const AuthorizeRequestSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z
    .string()
    .min(43)
    .max(128)
    .regex(codePattern, 'PKCE code_challenge contiene caracteres inválidos')
    .optional(),
  code_challenge_method: z.enum(['S256', 'plain']).optional(),
  nonce: z.string().optional(),
  prompt: z.string().optional(),
  login_hint: z.string().optional()
});

export type AuthorizeRequest = z.infer<typeof AuthorizeRequestSchema>;
