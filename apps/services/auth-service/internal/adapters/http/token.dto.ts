import { z } from 'zod';

const pkcePattern = /^[A-Za-z0-9\-._~]+$/;

export const TokenRequestSchema = z.object({
  grant_type: z.union([z.literal('authorization_code'), z.literal('refresh_token')]),
  code: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  code_verifier: z
    .string()
    .min(43)
    .max(128)
    .regex(pkcePattern, 'code_verifier inválido')
    .optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional()
});

export type TokenRequest = z.infer<typeof TokenRequestSchema>;
