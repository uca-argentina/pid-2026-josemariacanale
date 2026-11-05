import { unstable_rethrow } from 'next/navigation';
import { isSessionExpired, isUserDeactivated } from '@/app/api-error';
import { getInjection } from '@/di/container';
import { BadgeCelebration } from './BadgeCelebration';

/**
 * Pide los Niveles sin ver y los celebra. Va dentro de un `Suspense` en el layout: el back evalúa al Usuario antes de
 * responder, y esa espera no debe demorar el resto de la página. Si la consulta falla no se muestra nada: la
 * celebración nunca bloquea la app.
 */
export async function UnseenBadgeCelebration() {
    let badges;
    try {
        badges = await getInjection('IListUnseenBadgesController')();
    } catch (error) {
        unstable_rethrow(error);
        if (!isSessionExpired(error) && !isUserDeactivated(error)) getInjection('ICrashReporterService').report(error);
        return null;
    }
    return <BadgeCelebration badges={badges} />;
}
