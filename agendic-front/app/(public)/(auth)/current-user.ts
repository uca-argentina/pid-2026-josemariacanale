import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import type { DI_RETURN_TYPES } from '@/di/types';
import { UnauthenticatedError } from '@/src/entities/errors/auth';

export type CurrentUser = Awaited<ReturnType<DI_RETURN_TYPES['IGetCurrentUserController']>>;

// null means "no hay Sesión", and the layouts turn that into a redirect to Iniciar sesión. A
// crash is not that: swallowing it here would send the Usuario to Iniciar sesión for a failure
// they cannot fix. It is reported and rethrown so the error boundary shows the aviso instead.
export async function getCurrentUser(): Promise<CurrentUser | null> {
    try {
        const controller = getInjection('IGetCurrentUserController');
        return await controller();
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (error instanceof UnauthenticatedError) return null;
        getInjection('ICrashReporterService').report(error);
        throw error;
    }
}
