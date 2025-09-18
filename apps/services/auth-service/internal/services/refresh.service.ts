import { refreshRotatedCounter, refreshReuseBlockedCounter } from '../../../cmd/server/main';
import { rotateRefresh } from '../../security/jwt';

export async function refresh(token: string) {
    const pair = await rotateRefresh(token);
    if (!pair) {
        refreshReuseBlockedCounter.inc();
        throw new Error('Refresh token inválido o expirado');
    }

    refreshRotatedCounter.inc();

    return pair;
}
