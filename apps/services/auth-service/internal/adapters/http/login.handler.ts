import { Request, Response } from 'express';
import { LoginRequestSchema } from './login.dto';
import { getUserByEmail } from '../db/pg.adapter';
import { saveSession } from '../redis/redis.adapter';
import { verifyPassword } from '../../security/crypto';
import { issueTokenPair } from '../../security/jwt';
import { loginSuccessCounter, loginFailCounter } from '../../../cmd/server/main';

export async function loginHandler(req: Request, res: Response) {
  const parseResult = LoginRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
  }
  const { email, password } = parseResult.data;
  const tenant_id = req.body.tenant_id || 'default';
  const user = await getUserByEmail(email, tenant_id);
  let valid = false;
  if (user) {
    valid = await verifyPassword(user.pwd_hash, password);
  }
  if (!user || !valid) {
    loginFailCounter.inc();
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  // Generar tokens (access + refresh)
  const roles: string[] = []; // TODO: cargar roles reales vía getUserRoles
  const pair = await issueTokenPair({ sub: user.id, tenant_id, roles });
  // Sesión corta (opcional) para tracking
  await saveSession(pair.accessToken.substring(0, 24), { userId: user.id, tenant_id }, pair.expiresIn);
  loginSuccessCounter.inc();
  return res.status(200).json({
    message: 'Login exitoso',
    access_token: pair.accessToken,
    refresh_token: pair.refreshToken,
    token_type: 'Bearer',
    expires_in: pair.expiresIn
  });
}
