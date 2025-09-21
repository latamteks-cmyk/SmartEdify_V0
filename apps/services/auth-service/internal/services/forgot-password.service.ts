import { getUserByEmail } from '@db/pg.adapter';
import { savePasswordResetToken } from '../adapters/redis/redis.adapter';
import { passwordResetRequestedCounter } from '../observability/metrics';
import { randomBytes } from 'crypto';

export async function forgotPassword(email: string, tenantId: string) {
    const user = await getUserByEmail(email, tenantId);
    if (!user) {
        // No revelar si el usuario existe o no
        return;
    }

    const token = randomBytes(32).toString('hex');
    await savePasswordResetToken(token, { userId: user.id, email: user.email });
    
    // Aquí se podría enviar el token por correo electrónico al usuario
    console.log(`Password reset token for ${email}: ${token}`);

    passwordResetRequestedCounter.inc();

    return token;
}
