'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired, isUserDeactivated } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import { AuthProviderDeletionError } from '@/src/entities/errors/user';

export type RetireMeResult = { ok: true } | { ok: false; message: string; deactivated?: true };

/**
 * Da de baja al Usuario. Con `ok` o `deactivated` la Sesión de Clerk ya no sirve y el cliente la cierra:
 * `redirect` no puede hacerlo desde acá.
 */
export async function retireMeAction(): Promise<RetireMeResult> {
    try {
        await getInjection('IRetireMeController')();
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
        if (error instanceof AuthProviderDeletionError) return { ok: false, message: error.message };
        if (isUserDeactivated(error)) return { ok: false, message: 'Tu cuenta ya fue dada de baja.', deactivated: true };
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos darte de baja. Intentá de nuevo.' };
    }
}
