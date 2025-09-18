import { hashPassword } from '../../security/crypto';
import * as pgAdapter from '@db/pg.adapter';
import { consumePasswordResetToken, revokeAllUserSessions } from '../redis/redis.adapter';
import { passwordResetCompletedCounter } from '../../../cmd/server/main';

export async function resetPassword(token: string, newPassword: string) {
    const tokenObj = await consumePasswordResetToken(token);
    if (!tokenObj) {
        throw new Error('Token inválido o expirado');
    }

    const user = await pgAdapter.getUserById(tokenObj.userId);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    // Hashear y persistir nueva contraseña
    const hashed = await hashPassword(newPassword);
    await pgAdapter.pool.query('UPDATE users SET pwd_hash=$1 WHERE id=$2', [hashed, user.id]);

    // Invalidar todas las sesiones activas del usuario
    await revokeAllUserSessions(user.id);

    passwordResetCompletedCounter.inc();
}
