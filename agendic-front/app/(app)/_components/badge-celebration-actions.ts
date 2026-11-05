'use server';

import { unstable_rethrow } from 'next/navigation';
import { isSessionExpired, isUserDeactivated } from '@/app/api-error';
import { getInjection } from '@/di/container';

/**
 * Marca como vistos los Niveles que se acaban de celebrar. Si falla no se avisa: la celebración nunca bloquea, y
 * los Niveles sin marcar se vuelven a celebrar en la próxima carga.
 */
export async function markBadgesSeenAction(): Promise<void> {
    try {
        await getInjection('IMarkBadgesSeenController')();
    } catch (error) {
        unstable_rethrow(error);
        if (!isSessionExpired(error) && !isUserDeactivated(error)) getInjection('ICrashReporterService').report(error);
    }
}
